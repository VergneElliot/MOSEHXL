import crypto from 'crypto';
import { Router } from 'express';
import speakeasy from 'speakeasy';

import { CanonicalAuthRole, deriveCanonicalRole } from '../../auth/roleVocabulary';
import { generateToken } from '../../middleware/auth';
import {
  AppError,
  asyncHandler,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
} from '../../middleware/errorHandler';
import { RefreshTokenModel } from '../../models/refreshToken';
import { TokenBlocklistModel } from '../../models/tokenBlocklist';
import { UserModel } from '../../models/user';
import { Logger } from '../../utils/logger';
import {
  ACCESS_TOKEN_EXPIRES_IN,
  MAX_FAILED_LOGIN_ATTEMPTS,
  computeLockoutDurationMinutes,
  computeRefreshExpiry,
  isAdminTwoFactorEnforced,
  requiresAdminTwoFactor,
  toPositiveFiniteNumber,
} from './config';
import {
  resolveClientSessionId,
  setCsrfTokenCookie,
  setRefreshTokenCookie,
} from './cookies';
import { loginRateLimit } from './rateLimits';
import { deriveIpSubnet } from './sessionSignals';
import { logAuditOrThrow } from './sideEffects';

const loginRoutes = Router();

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
loginRoutes.post('/login', loginRateLimit, asyncHandler(async (req, res) => {
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

export default loginRoutes;
