import express from 'express';
import bcrypt from 'bcrypt';
import { getEstablishmentId, requireAuth, requirePermission } from './auth';
import { P } from '../permissions/registry';
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
  AppError,
  AuthorizationError,
} from '../middleware/errorHandler';
import { MembershipPinModel } from '../models/membershipPin';
import { StaffPinSessionModel } from '../models/staffPinSession';
import { UserModel } from '../models/user';
import { AuditTrailModel } from '../models/auditTrail';
import { parsePinBody } from '../middleware/pinActor';
import { createAuthRateLimitMiddleware } from '../middleware/security/AuthEndpointRateLimit';
import {
  buildDisplayName,
  signPinActorToken,
} from '../services/auth/pinActorToken';
import { resolvePinLengthRules } from '../services/auth/pinRules';
import { openPinSession } from '../services/auth/pinSessionService';
import { Logger } from '../utils/logger';

const router = express.Router();

/**
 * PIN verify is identity-less: the pad only receives digits, and the server scans every
 * membership hash in the establishment. A wrong PIN therefore matches nobody, so there is no
 * account whose failure counter could be incremented — per-user lockout cannot protect this
 * endpoint. The control is a throttle on the terminal (IP + logged-in account), plus a
 * security log on every failure so guessing is visible.
 */
const pinVerifyRateLimit = createAuthRateLimitMiddleware({
  logger: {
    security: (event, severity, metadata, requestId, userId) => {
      try {
        Logger.getInstance().security(event, severity, metadata || {}, requestId, userId);
      } catch {
        /* never break auth on logging failure */
      }
    },
  },
  keyPrefix: 'pin_verify',
  windowMs: 10 * 60 * 1000,
  maxRequests: process.env.NODE_ENV === 'development' ? 200 : 30,
  keyResolver: (req) => `ip:${req.ip ?? 'unknown'}:user:${req.user?.id ?? 'anon'}`,
  errorMessage: 'Trop de tentatives de PIN. Réessayez dans quelques minutes.',
});

async function logAuditBestEffort(
  entry: Parameters<typeof AuditTrailModel.logAction>[0],
  context: string
): Promise<void> {
  try {
    await AuditTrailModel.logAction(entry);
  } catch (error) {
    Logger.getInstance().error(
      `Audit trail logging failed (${context})`,
      error as Error,
      'PIN_ROUTE'
    );
  }
}

let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = bcrypt.hash('00000000', 12);
  }
  return dummyHashPromise;
}

/** Self-service allowed; managing another user requires user management. */
async function assertSelfOrUserManagement(
  actorId: number,
  targetUserId: number,
  establishmentId: string
): Promise<void> {
  if (actorId === targetUserId) return;
  const perms = await UserModel.getUserPermissions(actorId, establishmentId);
  if (!perms.includes(P.access_user_management)) {
    throw new AuthorizationError('Permission denied');
  }
}

async function logAuditOrThrow(
  entry: Parameters<typeof AuditTrailModel.logAction>[0],
  context: string
): Promise<void> {
  try {
    await AuditTrailModel.logAction(entry);
  } catch (error) {
    Logger.getInstance().error(`Audit trail logging failed (${context})`, error as Error, 'PIN_ROUTE');
    throw new AppError('Failed to persist audit trail entry', 500, 'AUDIT_LOG_FAILURE', { context });
  }
}

router.post(
  '/verify',
  requireAuth,
  pinVerifyRateLimit,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const pin = parsePinBody(req.body?.pin);

    const candidates = await MembershipPinModel.listPinMemberships(establishmentId);
    let matched = null as Awaited<ReturnType<typeof MembershipPinModel.findByPin>>;

    for (const row of candidates) {
      if (!row.pin_hash) continue;
      const ok = await bcrypt.compare(pin, row.pin_hash);
      if (ok) {
        matched = row;
        break;
      }
    }

    if (!matched) {
      // Constant-ish work when no match
      await bcrypt.compare(pin, await getDummyHash());
      Logger.getInstance().security(
        'PIN verification failed',
        'MEDIUM',
        {
          establishment_id: establishmentId,
          pin_length: pin.length,
          ip: req.ip,
        },
        req.requestId,
        req.user!.id
      );
      await logAuditBestEffort(
        {
          user_id: String(req.user!.id),
          action_type: 'pin_verify_failed',
          resource_type: 'membership_pin',
          action_details: { pin_length: pin.length },
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          establishment_id: establishmentId,
        },
        'pin_verify_failed'
      );
      throw new AppError('Invalid PIN', 400, 'PIN_INVALID');
    }

    if (MembershipPinModel.isLocked(matched)) {
      throw new AppError('PIN temporarily locked', 423, 'PIN_LOCKED', {
        locked_until: matched.pin_locked_until,
      });
    }

    await MembershipPinModel.clearLockout(matched.user_id, establishmentId);
    const permissions = await UserModel.getUserPermissions(matched.user_id, establishmentId);
    const display_name = buildDisplayName(matched.first_name, matched.last_name, matched.email);
    const sessionId = await openPinSession({
      establishmentId,
      pinUserId: matched.user_id,
      openedByUserId: req.user!.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    const pin_actor_token = signPinActorToken({
      id: matched.user_id,
      email: matched.email,
      role: matched.role,
      establishment_id: establishmentId,
      display_name,
      permissions,
      ...(sessionId ? { sid: sessionId } : {}),
      opened_by_user_id: req.user!.id,
    });

    await logAuditBestEffort(
      {
        user_id: String(req.user!.id),
        pin_user_id: matched.user_id,
        session_id: sessionId ?? undefined,
        action_type: 'pin_verify_success',
        resource_type: 'membership_pin',
        resource_id: String(matched.user_id),
        action_details: {
          pin_user_id: matched.user_id,
          pin_display_name: display_name,
          account_user_id: req.user!.id,
          pin_session_id: sessionId,
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        establishment_id: establishmentId,
      },
      'pin_verify_success'
    );

    return res.json({
      user_id: matched.user_id,
      email: matched.email,
      role: matched.role,
      display_name,
      permissions,
      pin_actor_token,
      pin_session_id: sessionId,
    });
  })
);

router.post(
  '/set',
  requireAuth,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const pin = parsePinBody(req.body?.pin);
    const targetUserId =
      req.body?.user_id != null ? Number(req.body.user_id) : req.user!.id;
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      throw new ValidationError('user_id must be a positive integer');
    }
    await assertSelfOrUserManagement(req.user!.id, targetUserId, establishmentId);

    // Ensure PIN uniqueness within establishment
    const existing = await MembershipPinModel.listPinMemberships(establishmentId);
    for (const row of existing) {
      if (row.user_id === targetUserId || !row.pin_hash) continue;
      if (await bcrypt.compare(pin, row.pin_hash)) {
        throw new ValidationError('This PIN is already used by another staff member');
      }
    }

    const membership = await MembershipPinModel.getMembershipWithPin(targetUserId, establishmentId);
    if (!membership) throw new NotFoundError('Active membership not found');
    const permissions = await UserModel.getUserPermissions(targetUserId, establishmentId);
    const rules = resolvePinLengthRules({ role: membership.role, permissions });

    try {
      await MembershipPinModel.setPin(targetUserId, establishmentId, pin, rules);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set PIN';
      if (message.includes('membership')) throw new NotFoundError(message);
      throw new ValidationError(message);
    }

    // A new PIN invalidates badges opened with the old one.
    const closedSessions = await StaffPinSessionModel.closeAllForUser(
      targetUserId,
      establishmentId,
      'pin_changed'
    );

    await logAuditOrThrow(
      {
        user_id: String(req.user!.id),
        action_type: 'pin_set',
        resource_type: 'membership_pin',
        resource_id: String(targetUserId),
        action_details: { target_user_id: targetUserId, closed_sessions: closedSessions },
        establishment_id: establishmentId,
      },
      'pin_set'
    );

    return res.json({ success: true, user_id: targetUserId, has_pin: true });
  })
);

router.delete(
  '/:userId',
  requireAuth,
  requirePermission(P.access_user_management),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const targetUserId = Number(req.params.userId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      throw new ValidationError('userId must be a positive integer');
    }

    const cleared = await MembershipPinModel.clearPin(targetUserId, establishmentId);
    if (!cleared) throw new NotFoundError('Membership not found');

    const closedSessions = await StaffPinSessionModel.closeAllForUser(
      targetUserId,
      establishmentId,
      'pin_cleared'
    );

    await logAuditOrThrow(
      {
        user_id: String(req.user!.id),
        action_type: 'pin_clear',
        resource_type: 'membership_pin',
        resource_id: String(targetUserId),
        action_details: { target_user_id: targetUserId, closed_sessions: closedSessions },
        establishment_id: establishmentId,
      },
      'pin_clear'
    );

    return res.json({ success: true, user_id: targetUserId, has_pin: false });
  })
);

router.get(
  '/status/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const targetUserId = Number(req.params.userId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      throw new ValidationError('userId must be a positive integer');
    }
    await assertSelfOrUserManagement(req.user!.id, targetUserId, establishmentId);
    const has_pin = await MembershipPinModel.hasPin(targetUserId, establishmentId);
    const membership = await MembershipPinModel.getMembershipWithPin(targetUserId, establishmentId);
    const permissions = await UserModel.getUserPermissions(targetUserId, establishmentId);
    const rules = resolvePinLengthRules({
      role: membership?.role ?? 'staff',
      permissions,
    });
    return res.json({
      user_id: targetUserId,
      has_pin,
      pin_kind: rules.kind,
      min_length: rules.min_length,
      max_length: rules.max_length,
    });
  })
);

export default router;
