import express from 'express';
import { getEstablishmentId, requireAuth, requirePermission } from './auth';
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

/** Active badges on this establishment. Seeing who is logged in is a management view. */
router.get(
  '/',
  requirePermission(P.access_user_management),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    // Access control already ignores idle/expired badges; settle their rows so the list and the
    // close_reason match what actually happened, without needing a background sweep.
    await StaffPinSessionModel.closeStale(establishmentId);
    const sessions = await StaffPinSessionModel.listActive(establishmentId);
    res.json({ success: true, data: sessions });
  })
);

/**
 * Close a badge. Closing your own current badge is always allowed (that is what leaving a tab
 * does); closing someone else's is a management action.
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
    const isOwnSession = actor?.sid === sessionId || session.opened_by_user_id === req.user!.id;
    if (!isOwnSession) {
      const permissions = await UserModel.getUserPermissions(req.user!.id, establishmentId);
      if (!permissions.includes(P.access_user_management)) {
        return res.status(403).json({
          error: 'Permission denied',
          code: 'PERMISSION_DENIED',
        });
      }
    }

    const reason = isOwnSession ? 'closed_by_user' : 'closed_by_manager';
    await closePinSession(sessionId, establishmentId, reason);
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
