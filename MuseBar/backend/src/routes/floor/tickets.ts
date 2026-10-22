import express from 'express';
import { getEstablishmentId, requireAuth, requirePermission } from '../auth';
import { P } from '../../permissions/registry';
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../../middleware/errorHandler';
import { DiningTableModel } from '../../models/database/floorModel';
import { OpenTicketModel } from '../../models/database/openTicketModel';
import { requireOpenTicketForActor, assertCanAbandonTicket } from '../../services/floor/floorTicketAuth';
import { openOrReuseEmptyTicket } from '../../services/floor/openTicketOpenService';
import { transferOpenTicketToTable } from '../../services/floor/openTicketTransferService';
import { requirePosPinActor } from '../../middleware/pinActor';
import { resolveWaiterDisplayName } from './shared';

const router = express.Router();

router.post(
  '/tickets',
  requireAuth,
  requirePosPinActor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const actor = req.pinActor!;
    const dining_table_id = Number(req.body?.dining_table_id);
    if (!Number.isInteger(dining_table_id)) {
      throw new ValidationError('dining_table_id is required');
    }
    const table = await DiningTableModel.get(dining_table_id, establishmentId);
    if (!table || !table.is_active) throw new NotFoundError('Dining table not found');
    const { ticket, items, created } = await openOrReuseEmptyTicket(establishmentId, {
      dining_table_id,
      opened_by_user_id: actor.id,
      covers: req.body?.covers != null ? Number(req.body.covers) : null,
      notes: typeof req.body?.notes === 'string' ? req.body.notes : null,
    });
    return res.status(created ? 201 : 200).json({ ticket, items });
  })
);

router.get(
  '/tickets/:id',
  requireAuth,
  requirePermission(P.access_pos),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid ticket id');
    const ticket = await OpenTicketModel.get(id, establishmentId);
    if (!ticket) throw new NotFoundError('Open ticket not found');
    const items = await OpenTicketModel.listActiveItems(id, establishmentId);
    const served_by_display_name = await resolveWaiterDisplayName(ticket.last_served_by_user_id);
    return res.json({ ticket, items, served_by_display_name });
  })
);

router.post(
  '/tickets/:id/abandon',
  requireAuth,
  requirePosPinActor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const actor = req.pinActor!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid ticket id');
    await requireOpenTicketForActor(id, establishmentId, actor);
    await assertCanAbandonTicket(id, establishmentId, actor);
    const ticket = await OpenTicketModel.abandon(id, establishmentId);
    if (!ticket) throw new NotFoundError('Open ticket not found or already closed');
    return res.json({ ticket });
  })
);

router.post(
  '/tickets/:id/close',
  requireAuth,
  requirePosPinActor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const actor = req.pinActor!;
    const id = Number(req.params.id);
    const orderId = Number(req.body?.order_id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid ticket id');
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new ValidationError('order_id is required');
    }
    const existing = await requireOpenTicketForActor(id, establishmentId, actor);
    void existing;
    const ticket = await OpenTicketModel.closeWithOrder(id, establishmentId, orderId);
    if (!ticket) throw new NotFoundError('Open ticket not found or already closed');
    return res.json({ ticket });
  })
);

router.post(
  '/tickets/:id/transfer',
  requireAuth,
  requirePosPinActor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const actor = req.pinActor!;
    const id = Number(req.params.id);
    const diningTableId = Number(req.body?.dining_table_id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid ticket id');
    if (!Number.isInteger(diningTableId)) throw new ValidationError('dining_table_id is required');
    await requireOpenTicketForActor(id, establishmentId, actor);
    try {
      const ticket = await transferOpenTicketToTable(id, establishmentId, diningTableId);
      return res.json({ ticket });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'OPEN_TICKET_NOT_FOUND_OR_CLOSED') {
        throw new NotFoundError('Open ticket not found or already closed');
      }
      if (message === 'DINING_TABLE_NOT_FOUND') throw new NotFoundError('Dining table not found');
      if (message === 'TARGET_TABLE_OCCUPIED') {
        throw new ConflictError('La table de destination est déjà occupée');
      }
      throw error;
    }
  })
);

router.post(
  '/tickets/:id/merge',
  requireAuth,
  requirePosPinActor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const actor = req.pinActor!;
    const id = Number(req.params.id);
    const targetTicketId = Number(req.body?.target_ticket_id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid ticket id');
    if (!Number.isInteger(targetTicketId)) throw new ValidationError('target_ticket_id is required');
    const sourceTicket = await requireOpenTicketForActor(id, establishmentId, actor);
    void sourceTicket;
    try {
      const result = await OpenTicketModel.mergeInto(id, targetTicketId, establishmentId);
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'OPEN_TICKET_NOT_FOUND_OR_CLOSED') {
        throw new NotFoundError('Open ticket not found or already closed');
      }
      if (message === 'MERGE_SAME_TICKET') {
        throw new ValidationError('Cannot merge a ticket into itself');
      }
      throw error;
    }
  })
);

export default router;
