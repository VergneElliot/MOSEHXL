import express from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
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
  getLegacyAdminClaimMetrics,
  requireAdmin,
  requireAuth,
} from '../middleware/auth';
import { pool } from '../db/pool';
import { CanonicalAuthRole, deriveCanonicalRole } from '../auth/roleVocabulary';
import {
  ACCESS_TOKEN_EXPIRES_IN,
  MAX_FAILED_LOGIN_ATTEMPTS,
  MAX_SUPPORT_IMPERSONATION_MINUTES,
  TOTP_ISSUER,
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
  validateRefreshCsrf,
} from './authLogin/cookies';
import { loginRateLimit, refreshRateLimit } from './authLogin/rateLimits';
import {
  deriveIpSubnet,
  logAdminEndpointAnomalySignal,
  logRefreshSessionAnomalySignal,
  normalizeUserAgent,
} from './authLogin/sessionSignals';
import { logAuditOrThrow, revokeTokenOrThrow } from './authLogin/sideEffects';

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

// ---------------------------------------------------------------------------
// 2FA / TOTP enrollment and management
// ---------------------------------------------------------------------------
router.get('/2fa/totp/status', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const dbUser = await UserModel.findById(userId);
  if (!dbUser) {
    throw new NotFoundError('User');
  }

  const role = deriveCanonicalRole({
    roleFromDb: dbUser.role,
    isAdminFlag: dbUser.is_admin,
    establishmentId: dbUser.establishment_id,
  });

  return res.json({
    enabled: dbUser.mfa_totp_enabled === true,
    required_for_role: isAdminTwoFactorEnforced() && requiresAdminTwoFactor(role),
    role,
  });
}));

router.post('/2fa/totp/setup', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const dbUser = await UserModel.findById(userId);
  if (!dbUser) {
    throw new NotFoundError('User');
  }

  const generatedSecret = speakeasy.generateSecret({
    length: 20,
    name: `${TOTP_ISSUER}:${dbUser.email}`,
    issuer: TOTP_ISSUER,
  });
  const secret = generatedSecret.base32;
  const otpauthUrl = generatedSecret.otpauth_url;
  if (!secret || !otpauthUrl) {
    throw new AppError('Failed to generate TOTP setup material', 500, 'MFA_TOTP_SETUP_GENERATION_FAILED');
  }
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  await UserModel.setMfaTotpSecret(userId, secret);

  await logAuditOrThrow({
    user_id: String(userId),
    action_type: 'MFA_TOTP_SETUP_STARTED',
    action_details: { issuer: TOTP_ISSUER },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'MFA_TOTP_SETUP_STARTED');

  return res.json({
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  });
}));

router.post('/2fa/totp/enable', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!code) {
    throw new ValidationError('code is required');
  }

  const mfaState = await UserModel.getMfaTotpState(userId);
  if (!mfaState?.mfa_totp_secret) {
    throw new ValidationError('TOTP setup is required before enabling two-factor authentication');
  }

  if (!speakeasy.totp.verify({
    secret: mfaState.mfa_totp_secret,
    encoding: 'base32',
    token: code,
    window: 1,
  })) {
    throw new ValidationError('Invalid two-factor authentication code');
  }

  await UserModel.enableMfaTotp(userId);
  await logAuditOrThrow({
    user_id: String(userId),
    action_type: 'MFA_TOTP_ENABLED',
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'MFA_TOTP_ENABLED');

  return res.json({ message: 'Two-factor authentication enabled' });
}));

router.post('/2fa/totp/disable', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!code || !password) {
    throw new ValidationError('code and password are required');
  }

  const dbUser = await UserModel.findById(userId);
  if (!dbUser) {
    throw new NotFoundError('User');
  }

  const validPassword = await UserModel.verifyPassword(dbUser, password);
  if (!validPassword) {
    throw new AuthenticationError('Invalid credentials');
  }

  const mfaState = await UserModel.getMfaTotpState(userId);
  if (!mfaState?.mfa_totp_enabled || !mfaState.mfa_totp_secret) {
    throw new ValidationError('Two-factor authentication is not enabled');
  }
  if (!speakeasy.totp.verify({
    secret: mfaState.mfa_totp_secret,
    encoding: 'base32',
    token: code,
    window: 1,
  })) {
    throw new ValidationError('Invalid two-factor authentication code');
  }

  await UserModel.disableMfaTotp(userId);
  await logAuditOrThrow({
    user_id: String(userId),
    action_type: 'MFA_TOTP_DISABLED',
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'MFA_TOTP_DISABLED');

  return res.json({ message: 'Two-factor authentication disabled' });
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

router.get('/sessions', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const currentRefreshToken = getRefreshTokenFromRequest(req);
  let currentFamilyId: string | null = null;
  if (currentRefreshToken) {
    const currentSession = await RefreshTokenModel.findActiveByRawToken(currentRefreshToken);
    if (currentSession?.user_id === userId) {
      currentFamilyId = currentSession.family_id;
    }
  }

  const sessions = await RefreshTokenModel.listActiveSessionsByUser(userId);
  return res.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      familyId: session.familyId,
      issuedAt: session.issuedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      ipAddress: session.ipAddress,
      ipSubnet: session.ipSubnet,
      userAgent: session.userAgent,
      clientId: session.clientId,
      isCurrent: currentFamilyId === session.familyId,
    })),
  });
}));

router.get('/legacy-claim-metrics', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  return res.json({
    metrics: getLegacyAdminClaimMetrics(),
    policy: {
      rejectLegacyIsAdminClaim:
        process.env.AUTH_REJECT_LEGACY_IS_ADMIN_CLAIM?.trim().toLowerCase() === 'true' ||
        (
          process.env.AUTH_REJECT_LEGACY_IS_ADMIN_CLAIM == null &&
          process.env.NODE_ENV === 'production'
        ),
    },
  });
}));

router.post('/sessions/revoke-others', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const refreshTokenRaw = getRefreshTokenFromRequest(req);
  if (!refreshTokenRaw) {
    throw new ValidationError('Refresh token cookie is required to revoke other sessions');
  }

  const currentSession = await RefreshTokenModel.findActiveByRawToken(refreshTokenRaw);
  if (!currentSession || currentSession.user_id !== userId) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  const revokedCount = await RefreshTokenModel.revokeAllForUserExceptFamily(
    userId,
    currentSession.family_id,
    'USER_REVOKE_OTHER_SESSIONS'
  );

  await logAuditOrThrow({
    user_id: String(userId),
    action_type: 'REVOKE_OTHER_SESSIONS',
    action_details: {
      revoked_count: revokedCount,
      preserved_family_id: currentSession.family_id,
    },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'REVOKE_OTHER_SESSIONS');

  return res.json({
    message: 'Other sessions revoked',
    revokedCount,
  });
}));

// ---------------------------------------------------------------------------
// POST /api/auth/refresh — re-issue token with current DB state
// ---------------------------------------------------------------------------
router.post('/refresh', refreshRateLimit, asyncHandler(async (req, res) => {
  const lockClient = await pool.connect();
  let refreshFamilyId: string | null = null;
  let refreshUserId: number | null = null;
  try {
    await lockClient.query('BEGIN');
    const refreshTokenRaw = getRefreshTokenFromRequest(req);
    const rememberMe = req.body?.rememberMe === true;
    if (!refreshTokenRaw || typeof refreshTokenRaw !== 'string') {
      throw new ValidationError('Refresh token cookie is required');
    }
    validateRefreshCsrf(req);
    const clientSessionId = resolveClientSessionId(req, res);
    const ipSubnet = deriveIpSubnet(req.ip);
    const currentUserAgent = normalizeUserAgent(req.headers['user-agent']);

    const refreshSession = await RefreshTokenModel.findActiveByRawToken(refreshTokenRaw);
    if (!refreshSession) {
      clearRefreshTokenCookie(res);
      throw new AuthenticationError('Invalid or expired refresh token');
    }
    refreshFamilyId = refreshSession.family_id;
    const userId = refreshSession.user_id;
    refreshUserId = userId;
    const familyIssuedAt = await RefreshTokenModel.getFamilyIssuedAt(refreshSession.family_id);
    const refreshSessionStartedAt = familyIssuedAt ?? refreshSession.issued_at ?? new Date();

    await lockClient.query('SELECT pg_advisory_xact_lock($1::bigint)', [userId]);

    // Re-fetch role and establishment_id in case they changed since last login
    const d = await UserModel.getAuthRoleState(userId);
    if (!d) {
      throw new NotFoundError('User');
    }
    const userRow = await UserModel.findById(userId);
    if (!userRow) {
      throw new NotFoundError('User');
    }
    const now = new Date();
    if (userRow.is_active === false) {
      await RefreshTokenModel.revokeAllForUser(userId, 'USER_INACTIVE_REFRESH_BLOCK');
      clearRefreshTokenCookie(res);
      clearCsrfTokenCookie(res);
      await logAuditOrThrow({
        user_id: String(userId),
        action_type: 'TOKEN_REFRESH_BLOCKED',
        action_details: { reason: 'USER_INACTIVE' },
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      }, 'TOKEN_REFRESH_BLOCKED_USER_INACTIVE');
      throw new AuthorizationError('Account is inactive');
    }

    const lockedUntil = userRow.locked_until ? new Date(userRow.locked_until) : null;
    if (lockedUntil && lockedUntil.getTime() > now.getTime()) {
      await RefreshTokenModel.revokeAllForUser(userId, 'ACCOUNT_LOCKED_REFRESH_BLOCK');
      clearRefreshTokenCookie(res);
      clearCsrfTokenCookie(res);
      await logAuditOrThrow({
        user_id: String(userId),
        action_type: 'TOKEN_REFRESH_BLOCKED',
        action_details: {
          reason: 'ACCOUNT_LOCKED',
          locked_until: lockedUntil.toISOString(),
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      }, 'TOKEN_REFRESH_BLOCKED_ACCOUNT_LOCKED');
      throw new AuthorizationError('Account is locked');
    }
    const is_admin: boolean = d.is_admin;
    const establishment_id: string | null = d.establishment_id || null;
    const role: CanonicalAuthRole = deriveCanonicalRole({
      roleFromDb: d.role,
      isAdminFlag: is_admin,
      establishmentId: establishment_id,
    });
    logRefreshSessionAnomalySignal(refreshSession, {
      clientId: clientSessionId,
      ipSubnet,
      userAgent: currentUserAgent,
      role,
      userId,
      requestId: req.requestId,
    });

    const token = generateToken(
      { id: userId, email: userRow.email, role, establishment_id },
      !!rememberMe,
      ACCESS_TOKEN_EXPIRES_IN as Parameters<typeof generateToken>[2]
    );
    const nextRefreshToken = crypto.randomBytes(32).toString('hex');
    const nextCsrfToken = crypto.randomBytes(32).toString('hex');
    const { expiresAt, refreshExpiresIn } = computeRefreshExpiry(!!rememberMe, refreshSessionStartedAt);
    if (expiresAt.getTime() <= Date.now()) {
      await RefreshTokenModel.revokeFamily(refreshSession.family_id, 'ABSOLUTE_SESSION_CAP_REACHED');
      clearRefreshTokenCookie(res);
      clearCsrfTokenCookie(res);
      throw new AuthenticationError('Session expired. Please log in again.');
    }
    await RefreshTokenModel.rotate(refreshTokenRaw, nextRefreshToken, {
      userId,
      familyId: refreshSession.family_id,
      expiresAt,
      ipAddress: req.ip,
      ipSubnet: ipSubnet ?? undefined,
      userAgent: currentUserAgent ?? undefined,
      clientId: clientSessionId,
    });

    await logAuditOrThrow({
      user_id: String(userId),
      action_type: 'TOKEN_REFRESH',
      action_details: { rememberMe: !!rememberMe },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, 'TOKEN_REFRESH');

    await lockClient.query('COMMIT');
    setRefreshTokenCookie(res, nextRefreshToken, !!rememberMe, expiresAt);
    setCsrfTokenCookie(res, nextCsrfToken, !!rememberMe, expiresAt);
    return res.json({
      token,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      refreshExpiresIn,
    });
  } catch (error) {
    await lockClient.query('ROLLBACK');
    if (error instanceof Error && error.message === 'REFRESH_TOKEN_ALREADY_USED_OR_EXPIRED') {
      if (refreshFamilyId) {
        try {
          await RefreshTokenModel.revokeFamily(refreshFamilyId, 'REUSE_DETECTED');
          if (refreshUserId !== null) {
            const revokeBeforeIat = Math.floor(Date.now() / 1000);
            await TokenBlocklistModel.revokeAllUserTokensIssuedBefore(
              refreshUserId,
              revokeBeforeIat,
              'REFRESH_REUSE_DETECTED'
            );
          }
        } catch (revokeError) {
          Logger.getInstance().error(
            `Failed to revoke refresh token family ${refreshFamilyId} after reuse detection`,
            revokeError as Error,
            'AUTH_ROUTE'
          );
        }
      }
      clearRefreshTokenCookie(res);
      clearCsrfTokenCookie(res);
      throw new AuthenticationError('Invalid or expired refresh token');
    }
    if (error instanceof AppError) {
      throw error;
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

