import express from 'express';
import bcrypt from 'bcrypt';
import { getEstablishmentId, requireAuth, requirePermission } from './auth';
import { P } from '../permissions/registry';
import { asyncHandler, ValidationError, NotFoundError, AppError } from '../middleware/errorHandler';
import { MembershipPinModel } from '../models/membershipPin';
import { UserModel } from '../models/user';
import { AuditTrailModel } from '../models/auditTrail';
import { parsePinBody } from '../middleware/pinActor';
import {
  buildDisplayName,
  signPinActorToken,
} from '../services/auth/pinActorToken';
import { Logger } from '../utils/logger';

const router = express.Router();

let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = bcrypt.hash('000000', 12);
  }
  return dummyHashPromise;
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
    const pin_actor_token = signPinActorToken({
      id: matched.user_id,
      email: matched.email,
      role: matched.role,
      establishment_id: establishmentId,
      display_name,
      permissions,
    });

    return res.json({
      user_id: matched.user_id,
      email: matched.email,
      role: matched.role,
      display_name,
      permissions,
      pin_actor_token,
    });
  })
);

router.post(
  '/set',
  requireAuth,
  requirePermission(P.access_user_management),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const pin = parsePinBody(req.body?.pin);
    const targetUserId =
      req.body?.user_id != null ? Number(req.body.user_id) : req.user!.id;
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      throw new ValidationError('user_id must be a positive integer');
    }

    // Ensure PIN uniqueness within establishment
    const existing = await MembershipPinModel.listPinMemberships(establishmentId);
    for (const row of existing) {
      if (row.user_id === targetUserId || !row.pin_hash) continue;
      if (await bcrypt.compare(pin, row.pin_hash)) {
        throw new ValidationError('This PIN is already used by another staff member');
      }
    }

    try {
      await MembershipPinModel.setPin(targetUserId, establishmentId, pin);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set PIN';
      if (message.includes('membership')) throw new NotFoundError(message);
      throw new ValidationError(message);
    }

    await logAuditOrThrow(
      {
        user_id: String(req.user!.id),
        action_type: 'pin_set',
        resource_type: 'membership_pin',
        resource_id: String(targetUserId),
        action_details: { target_user_id: targetUserId },
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

    await logAuditOrThrow(
      {
        user_id: String(req.user!.id),
        action_type: 'pin_clear',
        resource_type: 'membership_pin',
        resource_id: String(targetUserId),
        action_details: { target_user_id: targetUserId },
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
  requirePermission(P.access_user_management),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const targetUserId = Number(req.params.userId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      throw new ValidationError('userId must be a positive integer');
    }
    const has_pin = await MembershipPinModel.hasPin(targetUserId, establishmentId);
    return res.json({ user_id: targetUserId, has_pin });
  })
);

export default router;
