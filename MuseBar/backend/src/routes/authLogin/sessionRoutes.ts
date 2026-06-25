import crypto from 'crypto';
import { Router } from 'express';

import { deriveCanonicalRole } from '../../auth/roleVocabulary';
import { pool } from '../../db/pool';
import {
  generateToken,
  getLegacyAdminClaimMetrics,
  requireAdmin,
  requireAuth,
} from '../../middleware/auth';
import {
  AppError,
  asyncHandler,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '../../middleware/errorHandler';
import { RefreshTokenModel } from '../../models/refreshToken';
import { TokenBlocklistModel } from '../../models/tokenBlocklist';
import { UserModel } from '../../models/user';
import { Logger } from '../../utils/logger';
import { ACCESS_TOKEN_EXPIRES_IN, computeRefreshExpiry } from './config';
import {
  clearCsrfTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  resolveClientSessionId,
  setCsrfTokenCookie,
  setRefreshTokenCookie,
  validateRefreshCsrf,
} from './cookies';
import { refreshRateLimit } from './rateLimits';
import {
  deriveIpSubnet,
  logRefreshSessionAnomalySignal,
  normalizeUserAgent,
} from './sessionSignals';
import { logAuditOrThrow } from './sideEffects';

const sessionRoutes = Router();

// ---------------------------------------------------------------------------
// GET /api/auth/me — returns current user info and permissions
// Two lightweight indexed queries: users by PK + permissions join
// ---------------------------------------------------------------------------
sessionRoutes.get('/me', requireAuth, asyncHandler(async (req, res) => {
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

sessionRoutes.get('/sessions', requireAuth, asyncHandler(async (req, res) => {
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

sessionRoutes.get('/legacy-claim-metrics', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
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

sessionRoutes.post('/sessions/revoke-others', requireAuth, asyncHandler(async (req, res) => {
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
sessionRoutes.post('/refresh', refreshRateLimit, asyncHandler(async (req, res) => {
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
    const role = deriveCanonicalRole({
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

export default sessionRoutes;
