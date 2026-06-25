import express from 'express';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import { UserModel } from '../models/user';
import { TokenBlocklistModel } from '../models/tokenBlocklist';
import { RefreshTokenModel } from '../models/refreshToken';
import { Logger } from '../utils/logger';
import {
  AppError,
  asyncHandler,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '../middleware/errorHandler';
import {
  generateToken,
  requireAdmin,
  requireAuth,
} from '../middleware/auth';
import { pool } from '../db/pool';
import { CanonicalAuthRole, deriveCanonicalRole } from '../auth/roleVocabulary';
import {
  ACCESS_TOKEN_EXPIRES_IN,
  MAX_FAILED_LOGIN_ATTEMPTS,
  MAX_SUPPORT_IMPERSONATION_MINUTES,
  computeLockoutDurationMinutes,
  computeRefreshExpiry,
  isAdminTwoFactorEnforced,
  requiresAdminTwoFactor,
  toPositiveFiniteNumber,
} from './authLogin/config';
import {
  clearCsrfTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  resolveClientSessionId,
  setCsrfTokenCookie,
  setRefreshTokenCookie,
} from './authLogin/cookies';
import { loginRateLimit } from './authLogin/rateLimits';
import {
  deriveIpSubnet,
  logAdminEndpointAnomalySignal,
  normalizeUserAgent,
} from './authLogin/sessionSignals';
import { logAuditOrThrow, revokeTokenOrThrow } from './authLogin/sideEffects';
import sessionRoutes from './authLogin/sessionRoutes';
import totpRoutes from './authLogin/totpRoutes';

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post('/login', loginRateLimit, asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;
  const kickPriorSessions = req.body?.kickPriorSessions === true;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];
  const clientSessionId = resolveClientSessionId(req, res);
  const ipSubnet = deriveIpSubnet(req.ip);

  if (!email || !password) {
    throw new ValidationError('Email and password required');
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
      throw new AuthenticationError('Invalid credentials');
    }

    if (user.is_active === false) {
      await logAuditOrThrow({
        user_id: String(user.id),
        action_type: 'LOGIN_FAILED',
        action_details: { reason: 'User inactive', email },
        ip_address: ip,
        user_agent: userAgent,
      }, 'LOGIN_FAILED_USER_INACTIVE');
      throw new AuthorizationError('Account is inactive');
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
      throw new AuthenticationError('Invalid credentials');
    }

    const loginRole = deriveCanonicalRole({
      roleFromDb: user.role,
      isAdminFlag: user.is_admin,
      establishmentId: user.establishment_id,
    });

    if (isAdminTwoFactorEnforced() && requiresAdminTwoFactor(loginRole)) {
      const mfaState = await UserModel.getMfaTotpState(user.id);
      if (!mfaState?.mfa_totp_enabled || !mfaState.mfa_totp_secret) {
        await logAuditOrThrow({
          user_id: String(user.id),
          action_type: 'LOGIN_BLOCKED',
          action_details: {
            reason: 'ADMIN_2FA_SETUP_REQUIRED',
            email,
            role: loginRole,
          },
          ip_address: ip,
          user_agent: userAgent,
        }, 'LOGIN_BLOCKED_ADMIN_2FA_SETUP_REQUIRED');
        throw new AppError(
          'Two-factor authentication setup is required for this admin account',
          403,
          'ADMIN_2FA_SETUP_REQUIRED'
        );
      }

      const totpCode = typeof req.body?.totpCode === 'string' ? req.body.totpCode.trim() : '';
      const isValidTotp =
        totpCode.length > 0 &&
        speakeasy.totp.verify({
          secret: mfaState.mfa_totp_secret,
          encoding: 'base32',
          token: totpCode,
          window: 1,
        });
      if (!isValidTotp) {
        await logAuditOrThrow({
          user_id: String(user.id),
          action_type: 'LOGIN_FAILED',
          action_details: {
            reason: 'INVALID_2FA_CODE',
            email,
            role: loginRole,
          },
          ip_address: ip,
          user_agent: userAgent,
        }, 'LOGIN_FAILED_INVALID_2FA_CODE');
        throw new AppError('Invalid two-factor authentication code', 401, 'INVALID_2FA_CODE');
      }
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
      !!rememberMe,
      ACCESS_TOKEN_EXPIRES_IN as Parameters<typeof generateToken>[2]
    );
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const { expiresAt, refreshExpiresIn } = computeRefreshExpiry(!!rememberMe);
    await RefreshTokenModel.create({
      userId: user.id,
      token: refreshToken,
      expiresAt,
      ipAddress: req.ip,
      ipSubnet: ipSubnet ?? undefined,
      userAgent: req.headers['user-agent'],
      clientId: clientSessionId,
    });
    setRefreshTokenCookie(res, refreshToken, !!rememberMe, expiresAt);
    setCsrfTokenCookie(res, csrfToken, !!rememberMe, expiresAt);

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
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      refreshExpiresIn,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    Logger.getInstance().error('Login error', error as Error);
    throw new AppError('Internal server error during login', 500, 'LOGIN_FAILED');
  }
}));

router.use('/2fa/totp', totpRoutes);
router.use('/', sessionRoutes);

// ---------------------------------------------------------------------------
// POST /api/auth/support/impersonation/start
// Time-bounded support impersonation to one establishment (audited).
// ---------------------------------------------------------------------------
router.post('/support/impersonation/start', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const actorUserId = req.user!.id;
  const actorEmail = req.user!.email;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];
  const clientSessionId = resolveClientSessionId(req, res);
  const ipSubnet = deriveIpSubnet(req.ip);
  const currentUserAgent = normalizeUserAgent(userAgent);

  const establishmentIdRaw = req.body?.establishment_id;
  const reasonRaw = req.body?.reason;
  const durationRaw = req.body?.duration_minutes;

  const establishment_id = typeof establishmentIdRaw === 'string' ? establishmentIdRaw.trim() : '';
  const reason = typeof reasonRaw === 'string' ? reasonRaw.trim() : '';
  const duration_minutes = Number.isFinite(Number(durationRaw))
    ? Math.max(1, Math.min(MAX_SUPPORT_IMPERSONATION_MINUTES, Math.floor(Number(durationRaw))))
    : 30;

  if (!establishment_id) {
    throw new ValidationError('establishment_id is required');
  }
  if (!reason || reason.length < 5) {
    throw new ValidationError('reason is required (minimum 5 characters)');
  }

  try {
    const activeSessions = await RefreshTokenModel.listActiveSessionsByUser(actorUserId);
    const latestSession = activeSessions[0];
    if (latestSession) {
      logAdminEndpointAnomalySignal(
        'auth.support_impersonation.start',
        {
          clientId: latestSession.clientId,
          ipSubnet: latestSession.ipSubnet,
          userAgent: latestSession.userAgent,
        },
        {
          clientId: clientSessionId,
          ipSubnet,
          userAgent: currentUserAgent,
          userId: actorUserId,
          requestId: req.requestId,
        }
      );
    }
  } catch {
    // Best-effort anomaly signaling; do not block impersonation start on telemetry issues.
  }

  if (isAdminTwoFactorEnforced()) {
    const mfaState = await UserModel.getMfaTotpState(actorUserId);
    if (!mfaState?.mfa_totp_enabled || !mfaState.mfa_totp_secret) {
      await logAuditOrThrow({
        user_id: String(actorUserId),
        action_type: 'SUPPORT_IMPERSONATION_BLOCKED',
        action_details: {
          reason: 'ADMIN_2FA_SETUP_REQUIRED',
          establishment_id,
        },
        ip_address: ip,
        user_agent: userAgent,
      }, 'SUPPORT_IMPERSONATION_BLOCKED_ADMIN_2FA_SETUP_REQUIRED');
      throw new AppError(
        'Two-factor authentication setup is required for support impersonation',
        403,
        'SUPPORT_IMPERSONATION_2FA_SETUP_REQUIRED'
      );
    }

    const totpCode = typeof req.body?.totpCode === 'string' ? req.body.totpCode.trim() : '';
    const isValidTotp =
      totpCode.length > 0 &&
      speakeasy.totp.verify({
        secret: mfaState.mfa_totp_secret,
        encoding: 'base32',
        token: totpCode,
        window: 1,
      });
    if (!isValidTotp) {
      await logAuditOrThrow({
        user_id: String(actorUserId),
        action_type: 'SUPPORT_IMPERSONATION_BLOCKED',
        action_details: {
          reason: 'INVALID_2FA_CODE',
          establishment_id,
        },
        ip_address: ip,
        user_agent: userAgent,
      }, 'SUPPORT_IMPERSONATION_BLOCKED_INVALID_2FA_CODE');
      throw new AppError(
        'Invalid two-factor authentication code',
        401,
        'SUPPORT_IMPERSONATION_INVALID_2FA_CODE'
      );
    }
  }

  try {
    const estResult = await pool.query('SELECT id, name FROM establishments WHERE id = $1', [establishment_id]);
    if (estResult.rows.length === 0) {
      throw new NotFoundError('Target establishment');
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
    if (error instanceof AppError) {
      throw error;
    }
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
  const clientSessionId = resolveClientSessionId(req, res);
  const ipSubnet = deriveIpSubnet(req.ip);
  const currentUserAgent = normalizeUserAgent(userAgent);
  const currentImpersonation = req.user?.support_impersonation;

  if (!currentImpersonation || !req.user?.establishment_id) {
    throw new ValidationError('No active support impersonation session in this token');
  }

  try {
    const activeSessions = await RefreshTokenModel.listActiveSessionsByUser(actorUserId);
    const latestSession = activeSessions[0];
    if (latestSession) {
      logAdminEndpointAnomalySignal(
        'auth.support_impersonation.stop',
        {
          clientId: latestSession.clientId,
          ipSubnet: latestSession.ipSubnet,
          userAgent: latestSession.userAgent,
        },
        {
          clientId: clientSessionId,
          ipSubnet,
          userAgent: currentUserAgent,
          userId: actorUserId,
          requestId: req.requestId,
        }
      );
    }
  } catch {
    // Best-effort anomaly signaling; do not block impersonation stop on telemetry issues.
  }

  try {
    const d = await UserModel.getAuthRoleState(actorUserId);
    if (!d) {
      throw new NotFoundError('User');
    }

    const resetToken = generateToken(
      {
        id: actorUserId,
        email: req.user!.email,
        role: 'system_admin',
        establishment_id: null,
      },
      false,
      ACCESS_TOKEN_EXPIRES_IN as Parameters<typeof generateToken>[2]
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
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    Logger.getInstance().error('Failed to stop support impersonation', error as Error, 'AUTH_ROUTE');
    throw new AppError('Failed to stop support impersonation', 500, 'SUPPORT_IMPERSONATION_STOP_FAILED');
  }
}));

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req, { allowBodyFallback: true });
  const authorization = req.headers.authorization;
  const currentToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (currentToken) {
    await revokeTokenOrThrow(currentToken, req.user!.id, 'LOGOUT');
  }
  if (refreshToken) {
    await RefreshTokenModel.revokeByRawToken(refreshToken, 'LOGOUT');
  }
  clearRefreshTokenCookie(res);
  clearCsrfTokenCookie(res);

  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: 'LOGOUT',
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'LOGOUT');
  return res.json({ message: 'Logged out' });
}));

export default router;

