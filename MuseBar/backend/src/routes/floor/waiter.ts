import express from 'express';
import { getEstablishmentId, requireAuth } from '../auth';
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
} from '../../middleware/errorHandler';
import { OpenTicketModel } from '../../models/database/openTicketModel';
import { MembershipModel } from '../../models/membership';
import { requirePinActor } from '../../middleware/pinActor';
import { P } from '../../permissions/registry';
import { formatUserDisplayName, resolveWaiterDisplayName } from './shared';

const router = express.Router();

router.post(
  '/tickets/:id/assign-waiter',
  requireAuth,
  requirePinActor(P.pos_reassign_waiter),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = Number(req.params.id);
    const waiterUserId = Number(req.body?.user_id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid ticket id');
    if (!Number.isInteger(waiterUserId)) throw new ValidationError('user_id is required');
    const members = await MembershipModel.listUsersForEstablishment(establishmentId);
    if (!members.some((m) => m.id === waiterUserId)) {
      throw new ValidationError('Utilisateur introuvable dans cet établissement');
    }
    const ticket = await OpenTicketModel.assignWaiter(id, establishmentId, waiterUserId);
    if (!ticket) throw new NotFoundError('Open ticket not found or already closed');
    const served_by_display_name = await resolveWaiterDisplayName(ticket.last_served_by_user_id);
    return res.json({ ticket, served_by_display_name });
  })
);

router.get(
  '/service-staff',
  requireAuth,
  requirePinActor(P.pos_reassign_waiter),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const members = await MembershipModel.listUsersForEstablishment(establishmentId);
    const staff = members.map((m) => ({
      user_id: m.id,
      display_name: formatUserDisplayName(m),
      email: m.email,
      role: m.role,
    }));
    return res.json({ staff });
  })
);

export default router;
