import express from 'express';
import { getEstablishmentId, requireAuth } from './auth';
import { P } from '../permissions/registry';
import {
  asyncHandler,
  NotFoundError,
  ValidationError,
  AppError,
} from '../middleware/errorHandler';
import { readOptionalPinActor } from '../middleware/pinActor';
import { StaffPinSessionModel } from '../models/staffPinSession';
import { UserModel } from '../models/user';
import {
  closePinSession,
  settleExpiredPinSessions,
} from '../services/auth/pinSessionService';
import type { PointageCloseResult } from '../services/auth/pinSessionPointage';
import { buildPinPortal } from '../services/auth/pinPortalService';
import { logActorAction } from '../services/audit/auditActorLog';
import { listOwnedActiveTables } from '../services/auth/pinSessionPointage';

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
    await settleExpiredPinSessions(establishmentId);
    await StaffPinSessionModel.closeDuplicateOpens(establishmentId);
    const sessions = await StaffPinSessionModel.listActive(establishmentId);
    sessions.sort(
      (a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime()
    );
    res.json({ success: true, data: sessions });
  })
);

/** Portal home: every PIN profile + badge/pointage/table summary. */
router.get(
  '/portal',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const data = await buildPinPortal(establishmentId, req.ip ?? null);
    res.json({ success: true, data });
  })
);

/** Owned open tables for the active PIN (header chips). */
router.get(
  '/:sessionId/owned-tables',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const sessionId = String(req.params.sessionId ?? '');
    if (!UUID_RE.test(sessionId)) {
      throw new ValidationError('sessionId must be a uuid');
    }
    const session = await StaffPinSessionModel.findActive(sessionId, establishmentId);
    if (!session) throw new NotFoundError('Session not found or already closed');
    const tables = await listOwnedActiveTables(establishmentId, session.user_id);
    res.json({ success: true, data: tables });
  })
);

/**
 * Close a badge. The badge owner's PIN (any device) or the venue account that opened it
 * may close; otherwise user-management is required.
 * If the badge is already closed, still attempts clock-out when on the allowlist.
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

    const active = await StaffPinSessionModel.findActive(sessionId, establishmentId);
    const any = active ?? (await StaffPinSessionModel.findById(sessionId, establishmentId));
    if (!any) throw new NotFoundError('Session not found');

    const actor = readOptionalPinActor(req);
    const isOwnPinUser = actor?.id != null && Number(actor.id) === any.user_id;
    const isOwnSession =
      actor?.sid === sessionId ||
      isOwnPinUser ||
      any.opened_by_user_id === req.user!.id;
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
    const clientIp = req.ip ?? null;

    let pointage: PointageCloseResult;
    let closed = false;
    let alreadyClosed = !active;

    try {
      const result = await closePinSession(sessionId, establishmentId, reason, {
        pinUserId: any.user_id,
        ipAddress: clientIp,
      });
      if (typeof result === 'boolean') {
        closed = result;
        pointage = {
          recorded: false,
          reason: 'error',
          client_ip: clientIp,
          on_venue: false,
        };
      } else {
        closed = result.closed;
        alreadyClosed = result.already_closed || alreadyClosed;
        pointage = result.pointage;
      }
    } catch (error) {
      if (error instanceof AppError && error.errorCode === 'PIN_CLOSE_OPEN_TABLES') {
        await logActorAction(req, {
          action_type: 'pin_session_close_failed',
          resource_type: 'pin_session',
          resource_id: sessionId,
          establishment_id: establishmentId,
          action_details: {
            reason: 'blocked_tables',
            pin_user_id: any.user_id,
            client_ip: clientIp,
            details: error.details ?? null,
          },
        });
      }
      throw error;
    }

    await logActorAction(req, {
      action_type: 'pin_session_closed',
      resource_type: 'pin_session',
      resource_id: sessionId,
      establishment_id: establishmentId,
      action_details: {
        reason,
        pin_user_id: any.user_id,
        already_closed: alreadyClosed,
        pointage_recorded: pointage.recorded,
        pointage_reason: pointage.reason,
        time_entry_id: pointage.time_entry_id ?? null,
        client_ip: pointage.client_ip,
        on_venue: pointage.on_venue,
      },
    });

    res.json({
      success: true,
      session_id: sessionId,
      close_reason: reason,
      already_closed: alreadyClosed,
      closed,
      pointage,
    });
  })
);

export default router;
