import express from 'express';
import { getEstablishmentId, requireAuth } from '../auth';
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
} from '../../middleware/errorHandler';
import { DiningTableModel } from '../../models/database/floorModel';
import { OpenTicketModel } from '../../models/database/openTicketModel';
import { AuditTrailModel } from '../../models/auditTrail';
import { requireOpenTicketForActor } from '../../services/floor/floorTicketAuth';
import { discardDraftsClosingIfEmpty } from '../../services/floor/openTicketDiscardService';
import { abandonOpenTicketIfEmpty } from '../../services/floor/openTicketEmptyCleanup';
import { requirePosPinActor, requirePinActor } from '../../middleware/pinActor';
import { P } from '../../permissions/registry';
import { pool } from '../../db/pool';
import { resolveWaiterDisplayName } from './shared';

const router = express.Router();

router.post(
  '/tickets/:id/validate',
  requireAuth,
  requirePosPinActor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const actor = req.pinActor!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid ticket id');
    const ticket = await requireOpenTicketForActor(id, establishmentId, actor);
    const table = await DiningTableModel.get(ticket.dining_table_id, establishmentId);

    const lineIdsRaw = req.body?.line_ids;
    const lineIds =
      Array.isArray(lineIdsRaw) && lineIdsRaw.length > 0
        ? lineIdsRaw
            .map((v: unknown) => Number(v))
            .filter((n: number) => Number.isInteger(n) && n > 0)
        : undefined;

    try {
      const { activeItems, validatedItems } = await OpenTicketModel.validateDraftItems(
        id,
        establishmentId,
        lineIds?.length ? { lineIds } : undefined
      );
      if (validatedItems.length === 0) {
        throw new ValidationError('Aucun article en attente de validation');
      }

      const { dispatchKitchenFollowUpTickets } = await import(
        '../../services/kitchenPrinting/kitchenFollowUpDispatchService'
      );
      const { Logger } = await import('../../utils/logger');
      const printResult = await dispatchKitchenFollowUpTickets(pool, {
        establishmentId,
        tableLabel: table?.label ?? null,
        createdByUserId: actor.id,
        logger: Logger.getInstance(),
        items: validatedItems.map((item) => ({
          product_id: item.product_id ?? undefined,
          product_name: item.product_name,
          quantity: Number(item.quantity),
          kitchen_printer_ids_snapshot: item.kitchen_printer_ids_snapshot,
          print_pickup_slip_snapshot: item.print_pickup_slip_snapshot,
        })),
      });

      return res.json({ ticket, items: activeItems, print: printResult });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'OPEN_TICKET_NOT_FOUND_OR_CLOSED') {
        throw new NotFoundError('Open ticket not found or already closed');
      }
      throw error;
    }
  })
);

router.post(
  '/tickets/:id/discard-drafts',
  requireAuth,
  requirePosPinActor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const actor = req.pinActor!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid ticket id');
    try {
      await requireOpenTicketForActor(id, establishmentId, actor);
      const { ticket, items } = await discardDraftsClosingIfEmpty(id, establishmentId);
      return res.json({ ticket, items });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'OPEN_TICKET_NOT_FOUND_OR_CLOSED') {
        throw new NotFoundError('Open ticket not found or already closed');
      }
      throw error;
    }
  })
);

router.post(
  '/tickets/:id/cancel-lines',
  requireAuth,
  requirePinActor(P.orders_cancel),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const actor = req.pinActor!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid ticket id');
    const lineIdsRaw = req.body?.line_ids;
    if (!Array.isArray(lineIdsRaw) || lineIdsRaw.length === 0) {
      throw new ValidationError('line_ids must be a non-empty array');
    }
    const lineIds = lineIdsRaw
      .map((v: unknown) => Number(v))
      .filter((n: number) => Number.isInteger(n) && n > 0);
    if (lineIds.length === 0) throw new ValidationError('line_ids contains no valid ids');

    const ticket = await requireOpenTicketForActor(id, establishmentId, actor);
    const table = await DiningTableModel.get(ticket.dining_table_id, establishmentId);

    try {
      const cancelled = await OpenTicketModel.cancelValidatedLines(id, establishmentId, lineIds);

      void AuditTrailModel.logAction({
        user_id: String(actor.id),
        action_type: 'TABLE_LINE_RETOUR',
        resource_type: 'OPEN_TICKET',
        resource_id: String(id),
        action_details: {
          line_ids: lineIds,
          performed_by_user_id: actor.id,
          performed_by_display_name: actor.display_name,
          assigned_waiter_user_id: ticket.last_served_by_user_id,
          table_label: table?.label ?? null,
        },
      }).catch(() => undefined);

      const { dispatchKitchenRetourTickets } = await import(
        '../../services/kitchenPrinting/kitchenRetourDispatchService'
      );
      const { Logger } = await import('../../utils/logger');
      const printResult = await dispatchKitchenRetourTickets(pool, {
        establishmentId,
        ticketId: id,
        tableLabel: table?.label ?? null,
        createdByUserId: actor.id,
        logger: Logger.getInstance(),
        items: cancelled.map((item) => ({
          product_id: item.product_id ?? undefined,
          product_name: item.product_name,
          quantity: Number(item.quantity),
          kitchen_printer_ids_snapshot: item.kitchen_printer_ids_snapshot,
          print_pickup_slip_snapshot: item.print_pickup_slip_snapshot,
        })),
      });

      const items = await OpenTicketModel.listActiveItems(id, establishmentId);
      if (items.length === 0) {
        await abandonOpenTicketIfEmpty(id, establishmentId);
      }
      return res.json({ ticket, items, cancelled, print: printResult });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'OPEN_TICKET_NOT_FOUND_OR_CLOSED') {
        throw new NotFoundError('Open ticket not found or already closed');
      }
      if (message === 'NO_VALIDATED_LINES_TO_CANCEL') {
        throw new ValidationError('Seuls les articles validés peuvent être annulés');
      }
      throw error;
    }
  })
);

router.post(
  '/tickets/:id/move-lines',
  requireAuth,
  requirePosPinActor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const actor = req.pinActor!;
    const id = Number(req.params.id);
    const targetDiningTableId = Number(req.body?.target_dining_table_id);
    const lineIdsRaw = req.body?.line_ids;
    if (!Number.isInteger(id)) throw new ValidationError('Invalid ticket id');
    if (!Number.isInteger(targetDiningTableId)) {
      throw new ValidationError('target_dining_table_id is required');
    }
    if (!Array.isArray(lineIdsRaw) || lineIdsRaw.length === 0) {
      throw new ValidationError('line_ids must be a non-empty array');
    }
    const lineIds = lineIdsRaw
      .map((v: unknown) => Number(v))
      .filter((n: number) => Number.isInteger(n) && n > 0);
    if (lineIds.length === 0) throw new ValidationError('line_ids contains no valid ids');

    const sourceTicket = await requireOpenTicketForActor(id, establishmentId, actor);
    void sourceTicket;

    try {
      const result = await OpenTicketModel.moveLines(
        id,
        establishmentId,
        lineIds,
        targetDiningTableId
      );
      const targetTable = await DiningTableModel.get(targetDiningTableId, establishmentId);
      const sourceItems = await OpenTicketModel.listActiveItems(id, establishmentId);
      const targetItems = await OpenTicketModel.listActiveItems(result.target.id, establishmentId);
      const served_by_display_name = await resolveWaiterDisplayName(
        result.target.last_served_by_user_id
      );
      return res.json({
        source: result.source,
        target: result.target,
        target_table_label: targetTable?.label ?? null,
        served_by_display_name,
        source_items: sourceItems,
        target_items: targetItems,
        moved_line_ids: lineIds,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'OPEN_TICKET_NOT_FOUND_OR_CLOSED') {
        throw new NotFoundError('Open ticket not found or already closed');
      }
      if (message === 'DINING_TABLE_NOT_FOUND') throw new NotFoundError('Dining table not found');
      if (message === 'INVALID_LINE_IDS') {
        throw new ValidationError('Articles invalides ou non déplaçables');
      }
      if (message === 'MERGE_SAME_TICKET') {
        throw new ValidationError('La table de destination est la table actuelle');
      }
      throw error;
    }
  })
);

export default router;
