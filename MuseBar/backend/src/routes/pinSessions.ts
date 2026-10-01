import express from 'express';
import { getEstablishmentId, requireAuth } from './auth';
import { P } from '../permissions/registry';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { readOptionalPinActor } from '../middleware/pinActor';
import { StaffPinSessionModel } from '../models/staffPinSession';
import { UserModel } from '../models/user';
import { closePinSession } from '../services/auth/pinSessionService';
import { logActorAction } from '../services/audit/auditActorLog';

const router = express.Router();

const UUID_RE = /^[0-9a-fA-F-]{36}$/;

router.use(requireAuth);

/** Active badges on this establishment (header tabs + admin panel). One row per PIN user. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    // Settle expired badge rows so the list and close_reason stay honest.
    await StaffPinSessionModel.closeStale(establishmentId);
    await StaffPinSessionModel.closeDuplicateOpens(establishmentId);
    const sessions = await StaffPinSessionModel.listActive(establishmentId);
    sessions.sort(
      (a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime()
    );
    res.json({ success: true, data: sessions });
  })
);

/**
 * Close a badge. The badge owner's PIN (any device) or the venue account that opened it
 * may close; otherwise user-management is required.
 */
router.post(
  '/:sessionId/close',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const sessionId = String(req.params.sessionId ?? '');
    if (!UUID_RE.test(sessionId)) {
      throw new ValidationError('sessionId must be a uuid');
    }

    const session = await StaffPinSessionModel.findActive(sessionId, establishmentId);
    if (!session) throw new NotFoundError('Session not found or already closed');

    const actor = readOptionalPinActor(req);
    const isOwnPinUser = actor?.id != null && Number(actor.id) === session.user_id;
    const isOwnSession =
      actor?.sid === sessionId ||
      isOwnPinUser ||
      session.opened_by_user_id === req.user!.id;
    if (!isOwnSession) {
      const permissions = await UserModel.getUserPermissions(req.user!.id, establishmentId);
      if (!permissions.includes(P.access_user_management)) {
        return res.status(403).json({
          error: 'Permission denied',
          code: 'PERMISSION_DENIED',
        });
      }
    }

    const reason = isOwnPinUser || actor?.sid === sessionId ? 'closed_by_user' : 'closed_by_manager';
    await closePinSession(sessionId, establishmentId, reason, {
      pinUserId: session.user_id,
      ipAddress: req.ip ?? null,
    });
    await logActorAction(req, {
      action_type: 'pin_session_closed',
      resource_type: 'pin_session',
      resource_id: sessionId,
      establishment_id: establishmentId,
      action_details: { reason, pin_user_id: session.user_id },
    });

    res.json({ success: true, session_id: sessionId, close_reason: reason });
  })
);

export default router;
