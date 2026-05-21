import express from 'express';
import crypto from 'crypto';
import { UserModel } from '../models/user';
import { AuditTrailModel } from '../models/auditTrail';
import { TokenBlocklistModel } from '../models/tokenBlocklist';
import { RefreshTokenModel } from '../models/refreshToken';
import { Logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import {
  generateToken,
  requireAdmin,
  requireAuth,
} from '../middleware/auth';
import { pool } from '../db/pool';
import { CanonicalAuthRole, deriveCanonicalRole } from '../auth/roleVocabulary';
import {
  createAuthRateLimitMiddleware,
  resolveOpaqueRefreshRateLimitKey,
  resolveLoginRateLimitKey
} from '../middleware/security/AuthEndpointRateLimit';

const router = express.Router();

const MAX_SUPPORT_IMPERSONATION_MINUTES = 120;
const MAX_FAILED_LOGIN_ATTEMPTS = Number(process.env.AUTH_LOCKOUT_MAX_FAILED_ATTEMPTS ?? 5);
const BASE_LOCKOUT_MINUTES = Number(process.env.AUTH_LOCKOUT_BASE_MINUTES ?? 15);
const MAX_LOCKOUT_MINUTES = Number(process.env.AUTH_LOCKOUT_MAX_MINUTES ?? 240);
const authRateLimitBase = process.env.NODE_ENV === 'development' ? 5 : 1;
const authLimiterPool = process.env.NODE_ENV === 'test' ? undefined : pool;
const authRateLimitLogger = {
  security: (
    event: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    metadata?: Record<string, unknown>,
    requestId?: string,
    userId?: number
  ) => {
    try {
      Logger.getInstance().security(event, severity, metadata, requestId, userId);
    } catch {
      // In isolated tests the logger may not be initialized; skip side-effect logging.
    }
  },
};

const loginRateLimit = createAuthRateLimitMiddleware({
  logger: authRateLimitLogger,
  pool: authLimiterPool,
  keyPrefix: 'auth_login',
  windowMs: 15 * 60 * 1000,
  maxRequests: 10 * authRateLimitBase,
  keyResolver: resolveLoginRateLimitKey,
  errorMessage: 'Too many login attempts. Please retry later.',
});

const refreshRateLimit = createAuthRateLimitMiddleware({
  logger: authRateLimitLogger,
  pool: authLimiterPool,
  keyPrefix: 'auth_refresh',
  windowMs: 15 * 60 * 1000,
  maxRequests: 30 * authRateLimitBase,
  keyResolver: resolveOpaqueRefreshRateLimitKey,
  errorMessage: 'Too many token refresh attempts. Please retry later.',
});

function computeRefreshExpiry(rememberMe: boolean): { expiresAt: Date; refreshExpiresIn: string } {
  const days = rememberMe ? 7 : 1;
  return {
    expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    refreshExpiresIn: rememberMe ? '7d' : '1d',
  };
}

function toPositiveFiniteNumber(raw: number, fallback: number): number {
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

function computeLockoutDurationMinutes(lockoutCount: number): number {
  const base = toPositiveFiniteNumber(BASE_LOCKOUT_MINUTES, 15);
  const max = toPositiveFiniteNumber(MAX_LOCKOUT_MINUTES, 240);
  const exponent = Math.max(0, lockoutCount - 1);
  return Math.min(max, base * (2 ** exponent));
}

function getRefreshCookieName(): string {
  return 'musebar_refresh_token';
}

function getRefreshTokenFromRequest(req: express.Request): string | null {
  const rawCookieHeader = req.headers.cookie;
  if (typeof rawCookieHeader === 'string' && rawCookieHeader.length > 0) {
    const cookiePair = rawCookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${getRefreshCookieName()}=`));
    if (cookiePair) {
      const value = cookiePair.slice(getRefreshCookieName().length + 1).trim();
      if (value.length > 0) return decodeURIComponent(value);
    }
  }
  const bodyToken = req.body?.refreshToken;
  return typeof bodyToken === 'string' && bodyToken.trim().length > 0 ? bodyToken.trim() : null;
}

function setRefreshTokenCookie(res: express.Response, refreshToken: string, rememberMe: boolean): void {
  const maxAgeMs = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  res.cookie(getRefreshCookieName(), refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: maxAgeMs,
  });
}

function clearRefreshTokenCookie(res: express.Response): void {
  res.clearCookie(getRefreshCookieName(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
}

async function logAuditOrThrow(
  entry: Parameters<typeof AuditTrailModel.logAction>[0],
  context: string
): Promise<void> {
  try {
    await AuditTrailModel.logAction(entry);
  } catch (error) {
    Logger.getInstance().error(
      `Audit trail logging failed (${context})`,
      error as Error,
      'AUTH_ROUTE'
    );
    throw new AppError('Failed to persist audit trail entry', 500, 'AUDIT_LOG_FAILURE', { context });
  }
}

async function revokeTokenOrThrow(token: string, userId: number, reason: string): Promise<void> {
  try {
    await TokenBlocklistModel.revokeToken(token, { userId, reason });
  } catch (error) {
    Logger.getInstance().error(
      `Token revocation failed (${reason})`,
      error as Error,
      'AUTH_ROUTE'
    );
    throw new AppError('Failed to revoke token', 500, 'TOKEN_REVOCATION_FAILED', { reason });
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post('/login', loginRateLimit, asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;
  const kickPriorSessions = req.body?.kickPriorSessions === true;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const user = await UserModel.findByEmail(email);

    if (!user) {
      await logAuditOrThrow({
        action_type: 'LOGIN_FAILED',
        action_details: { reason: 'User not found', email },
        ip_address: ip,
        user_agent: userAgent,
      }, 'LOGIN_FAILED_USER_NOT_FOUND');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.is_active === false) {
      await logAuditOrThrow({
        user_id: String(user.id),
        action_type: 'LOGIN_FAILED',
        action_details: { reason: 'User inactive', email },
        ip_address: ip,
        user_agent: userAgent,
      }, 'LOGIN_FAILED_USER_INACTIVE');
      return res.status(403).json({ error: 'Account is inactive' });
    }

    const now = new Date();
    if (user.locked_until && new Date(user.locked_until).getTime() > now.getTime()) {
      await logAuditOrThrow({
        user_id: String(user.id),
        action_type: 'LOGIN_BLOCKED',
        action_details: {
          reason: 'ACCOUNT_LOCKED',
          locked_until: new Date(user.locked_until).toISOString(),
          email,
        },
        ip_address: ip,
        user_agent: userAgent,
      }, 'LOGIN_BLOCKED_ACCOUNT_LOCKED');
      return res.status(423).json({
        error: 'Account is temporarily locked due to repeated failed login attempts',
        code: 'ACCOUNT_LOCKED',
        lockedUntil: new Date(user.locked_until).toISOString(),
      });
    }

    const valid = await UserModel.verifyPassword(user, password);
    if (!valid) {
      const failedAttempts = await UserModel.incrementFailedLoginAttempts(user.id);
      const lockThreshold = toPositiveFiniteNumber(MAX_FAILED_LOGIN_ATTEMPTS, 5);
      if (failedAttempts >= lockThreshold) {
        const nextLockoutCount = (user.lockout_count ?? 0) + 1;
        const lockMinutes = computeLockoutDurationMinutes(nextLockoutCount);
        const lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
        await UserModel.applyLoginLockout(user.id, lockedUntil);
        await logAuditOrThrow({
          user_id: String(user.id),
          action_type: 'ACCOUNT_LOCKED',
          action_details: {
            email,
            failed_attempts: failedAttempts,
            lockout_count: nextLockoutCount,
            lockout_minutes: lockMinutes,
            locked_until: lockedUntil.toISOString(),
          },
          ip_address: ip,
          user_agent: userAgent,
        }, 'LOGIN_ACCOUNT_LOCKED');
      }
      await logAuditOrThrow({
        user_id: String(user.id),
        action_type: 'LOGIN_FAILED',
        action_details: { reason: 'Invalid password', email, failed_attempts: failedAttempts },
        ip_address: ip,
        user_agent: userAgent,
      }, 'LOGIN_FAILED_INVALID_PASSWORD');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await UserModel.clearLoginLockoutState(user.id);

    // Fetch the full user record to build the JWT payload
    const d = await UserModel.getAuthLoginDetails(user.id);

    const is_admin: boolean = d?.is_admin ?? user.is_admin;
    const establishment_id: string | null = d?.establishment_id || null;
    const role: CanonicalAuthRole = deriveCanonicalRole({
      roleFromDb: d?.role,
      isAdminFlag: is_admin,
      establishmentId: establishment_id,
    });

    if (kickPriorSessions) {
      const revokeBeforeIat = Math.floor(Date.now() / 1000);
      await TokenBlocklistModel.revokeAllUserTokensIssuedBefore(
        user.id,
        revokeBeforeIat,
        'LOGIN_KICK_PRIOR_SESSIONS'
      );
    }

    const token = generateToken(
      { id: user.id, email: user.email, role, establishment_id },
      !!rememberMe
    );
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const { expiresAt, refreshExpiresIn } = computeRefreshExpiry(!!rememberMe);
    await RefreshTokenModel.create({
      userId: user.id,
      token: refreshToken,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    setRefreshTokenCookie(res, refreshToken, !!rememberMe);

    await logAuditOrThrow({
      user_id: String(user.id),
      action_type: 'LOGIN',
      action_details: { email, rememberMe: !!rememberMe, kickPriorSessions },
      ip_address: ip,
      user_agent: userAgent,
    }, 'LOGIN_SUCCESS');

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        is_admin,
        role,
        first_name: d?.first_name || '',
        last_name: d?.last_name || '',
        establishment_id,
        permissions: [],
      },
      expiresIn: '15m',
      refreshExpiresIn,
    });
  } catch (error) {
    Logger.getInstance().error('Login error', error as Error);
    throw new AppError('Internal server error during login', 500, 'LOGIN_FAILED');
  }
}));

// ---------------------------------------------------------------------------
// GET /api/auth/me — returns current user info and permissions
// Two lightweight indexed queries: users by PK + permissions join
// ---------------------------------------------------------------------------
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  try {
    const userId = req.user!.id;

    const [userResult, permissions] = await Promise.all([
      UserModel.getAuthMeProfile(userId),
      UserModel.getUserPermissions(userId).catch(() => [] as string[]),
    ]);

    const userRow = userResult;

    return res.json({
      id: userId,
      email: req.user!.email,
      is_admin: req.user!.is_admin,
      role: req.user!.role,
      establishment_id: req.user!.establishment_id,
      first_name: userRow?.first_name || '',
      last_name: userRow?.last_name || '',
      email_verified: userRow?.email_verified ?? false,
      permissions,
      support_impersonation: req.user!.support_impersonation ?? null,
    });
  } catch {
    throw new AppError('Internal server error', 500, 'AUTH_ME_FAILED');
  }
}));

// ---------------------------------------------------------------------------
// POST /api/auth/refresh — re-issue token with current DB state
// ---------------------------------------------------------------------------
router.post('/refresh', refreshRateLimit, asyncHandler(async (req, res) => {
  const lockClient = await pool.connect();
  try {
    await lockClient.query('BEGIN');
    const refreshTokenRaw = getRefreshTokenFromRequest(req);
    const rememberMe = req.body?.rememberMe === true;
    if (!refreshTokenRaw || typeof refreshTokenRaw !== 'string') {
      await lockClient.query('COMMIT');
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    const refreshSession = await RefreshTokenModel.findActiveByRawToken(refreshTokenRaw);
    if (!refreshSession) {
      await lockClient.query('COMMIT');
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    const userId = refreshSession.user_id;

    await lockClient.query('SELECT pg_advisory_xact_lock($1::bigint)', [userId]);

    // Re-fetch role and establishment_id in case they changed since last login
    const d = await UserModel.getAuthRoleState(userId);
    if (!d) {
      await lockClient.query('COMMIT');
      return res.status(404).json({ error: 'User not found' });
    }
    const userRow = await UserModel.findById(userId);
    if (!userRow) {
      await lockClient.query('COMMIT');
      return res.status(404).json({ error: 'User not found' });
    }
    const is_admin: boolean = d.is_admin;
    const establishment_id: string | null = d.establishment_id || null;
    const role: CanonicalAuthRole = deriveCanonicalRole({
      roleFromDb: d.role,
      isAdminFlag: is_admin,
      establishmentId: establishment_id,
    });

    const token = generateToken(
      { id: userId, email: userRow.email, role, establishment_id },
      !!rememberMe
    );
    const nextRefreshToken = crypto.randomBytes(32).toString('hex');
    const { expiresAt, refreshExpiresIn } = computeRefreshExpiry(!!rememberMe);
    await RefreshTokenModel.rotate(refreshTokenRaw, nextRefreshToken, {
      userId,
      familyId: refreshSession.family_id,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    await logAuditOrThrow({
      user_id: String(userId),
      action_type: 'TOKEN_REFRESH',
      action_details: { rememberMe: !!rememberMe },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, 'TOKEN_REFRESH');

    await lockClient.query('COMMIT');
    setRefreshTokenCookie(res, nextRefreshToken, !!rememberMe);
    return res.json({
      token,
      expiresIn: '15m',
      refreshExpiresIn,
    });
  } catch (error) {
    await lockClient.query('ROLLBACK');
    if (error instanceof Error && error.message === 'REFRESH_TOKEN_ALREADY_USED_OR_EXPIRED') {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    throw new AppError('Internal server error', 500, 'TOKEN_REFRESH_FAILED');
  } finally {
    lockClient.release();
  }
}));

// ---------------------------------------------------------------------------
// POST /api/auth/support/impersonation/start
// Time-bounded support impersonation to one establishment (audited).
// ---------------------------------------------------------------------------
router.post('/support/impersonation/start', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const actorUserId = req.user!.id;
  const actorEmail = req.user!.email;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  const establishmentIdRaw = req.body?.establishment_id;
  const reasonRaw = req.body?.reason;
  const durationRaw = req.body?.duration_minutes;

  const establishment_id = typeof establishmentIdRaw === 'string' ? establishmentIdRaw.trim() : '';
  const reason = typeof reasonRaw === 'string' ? reasonRaw.trim() : '';
  const duration_minutes = Number.isFinite(Number(durationRaw))
    ? Math.max(1, Math.min(MAX_SUPPORT_IMPERSONATION_MINUTES, Math.floor(Number(durationRaw))))
    : 30;

  if (!establishment_id) {
    return res.status(400).json({ error: 'establishment_id is required' });
  }
  if (!reason || reason.length < 5) {
    return res.status(400).json({ error: 'reason is required (minimum 5 characters)' });
  }

  try {
    const estResult = await pool.query('SELECT id, name FROM establishments WHERE id = $1', [establishment_id]);
    if (estResult.rows.length === 0) {
      return res.status(404).json({ error: 'Target establishment not found' });
    }
    const estName = String(estResult.rows[0].name ?? '');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration_minutes * 60 * 1000);
    const supportToken = generateToken(
      {
        id: actorUserId,
        email: actorEmail,
        role: 'system_admin',
        establishment_id,
        support_impersonation: {
          actor_user_id: actorUserId,
          reason,
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        },
      },
      false,
      `${duration_minutes}m`
    );

    await logAuditOrThrow({
      user_id: String(actorUserId),
      establishment_id,
      action_type: 'SUPPORT_IMPERSONATION_STARTED',
      resource_type: 'ESTABLISHMENT',
      resource_id: establishment_id,
      action_details: {
        target_establishment_name: estName,
        reason,
        duration_minutes,
        token_expires_at: expiresAt.toISOString(),
      },
      ip_address: ip,
      user_agent: userAgent,
    }, 'SUPPORT_IMPERSONATION_STARTED');

    const authorization = req.headers.authorization;
    const currentToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (currentToken) {
      await revokeTokenOrThrow(currentToken, actorUserId, 'SUPPORT_IMPERSONATION_STARTED');
    }

    return res.json({
      message: 'Support impersonation started',
      token: supportToken,
      expires_at: expiresAt.toISOString(),
      establishment_id,
      reason,
    });
  } catch (error) {
    Logger.getInstance().error('Failed to start support impersonation', error as Error, 'AUTH_ROUTE');
    throw new AppError('Failed to start support impersonation', 500, 'SUPPORT_IMPERSONATION_START_FAILED');
  }
}));

// ---------------------------------------------------------------------------
// POST /api/auth/support/impersonation/stop
// End support impersonation and return a standard system_admin token.
// ---------------------------------------------------------------------------
router.post('/support/impersonation/stop', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const actorUserId = req.user!.id;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];
  const currentImpersonation = req.user?.support_impersonation;

  if (!currentImpersonation || !req.user?.establishment_id) {
    return res.status(400).json({ error: 'No active support impersonation session in this token' });
  }

  try {
    const d = await UserModel.getAuthRoleState(actorUserId);
    if (!d) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = generateToken(
      {
        id: actorUserId,
        email: req.user!.email,
        role: 'system_admin',
        establishment_id: null,
      },
      false
    );

    await logAuditOrThrow({
      user_id: String(actorUserId),
      establishment_id: req.user.establishment_id,
      action_type: 'SUPPORT_IMPERSONATION_ENDED',
      resource_type: 'ESTABLISHMENT',
      resource_id: req.user.establishment_id,
      action_details: {
        reason: currentImpersonation.reason,
        started_at: currentImpersonation.started_at,
        ended_at: new Date().toISOString(),
      },
      ip_address: ip,
      user_agent: userAgent,
    }, 'SUPPORT_IMPERSONATION_ENDED');

    const authorization = req.headers.authorization;
    const currentToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (currentToken) {
      await revokeTokenOrThrow(currentToken, actorUserId, 'SUPPORT_IMPERSONATION_ENDED');
    }

    return res.json({
      message: 'Support impersonation ended',
      token: resetToken,
      expiresIn: '15m',
    });
  } catch (error) {
    Logger.getInstance().error('Failed to stop support impersonation', error as Error, 'AUTH_ROUTE');
    throw new AppError('Failed to stop support impersonation', 500, 'SUPPORT_IMPERSONATION_STOP_FAILED');
  }
}));

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  const authorization = req.headers.authorization;
  const currentToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (currentToken) {
    await revokeTokenOrThrow(currentToken, req.user!.id, 'LOGOUT');
  }
  if (refreshToken) {
    await RefreshTokenModel.revokeByRawToken(refreshToken, 'LOGOUT');
  }
  clearRefreshTokenCookie(res);

  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: 'LOGOUT',
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'LOGOUT');
  return res.json({ message: 'Logged out' });
}));

export default router;

