import { Router } from 'express';
import speakeasy from 'speakeasy';

import { pool } from '../../db/pool';
import { generateToken, requireAdmin, requireAuth } from '../../middleware/auth';
import {
  AppError,
  asyncHandler,
  NotFoundError,
  ValidationError,
} from '../../middleware/errorHandler';
import { RefreshTokenModel } from '../../models/refreshToken';
import { UserModel } from '../../models/user';
import { Logger } from '../../utils/logger';
import {
  ACCESS_TOKEN_EXPIRES_IN,
  MAX_SUPPORT_IMPERSONATION_MINUTES,
  isAdminTwoFactorEnforced,
} from './config';
import {
  clearCsrfTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  resolveClientSessionId,
} from './cookies';
import {
  deriveIpSubnet,
  logAdminEndpointAnomalySignal,
  normalizeUserAgent,
} from './sessionSignals';
import { logAuditOrThrow, revokeTokenOrThrow } from './sideEffects';

const supportRoutes = Router();

// ---------------------------------------------------------------------------
// POST /api/auth/support/impersonation/start
// Time-bounded support impersonation to one establishment (audited).
// ---------------------------------------------------------------------------
supportRoutes.post('/support/impersonation/start', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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
supportRoutes.post('/support/impersonation/stop', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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
supportRoutes.post('/logout', requireAuth, asyncHandler(async (req, res) => {
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

export default supportRoutes;
