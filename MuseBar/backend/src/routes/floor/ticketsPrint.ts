import express from 'express';
import { getEstablishmentId, requireAuth } from '../auth';
import {
  asyncHandler,
  ValidationError,
} from '../../middleware/errorHandler';
import { DiningTableModel } from '../../models/database/floorModel';
import { OpenTicketModel } from '../../models/database/openTicketModel';
import { requireOpenTicketForActor } from '../../services/floor/floorTicketAuth';
import { requirePosPinActor } from '../../middleware/pinActor';
import { pool } from '../../db/pool';

const router = express.Router();

router.post(
  '/tickets/:id/print-suivre',
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
    let items = await OpenTicketModel.listActiveItems(id, establishmentId);
    const itemIdsRaw = req.body?.item_ids;
    if (Array.isArray(itemIdsRaw) && itemIdsRaw.length > 0) {
      const allowed = new Set(itemIdsRaw.map((v: unknown) => Number(v)).filter((n: number) => Number.isInteger(n)));
      items = items.filter((item) => allowed.has(item.id));
    } else {
      items = items.filter((item) => item.line_status === 'draft');
    }
    if (items.length === 0) throw new ValidationError('No items to print');

    const { dispatchKitchenFollowUpTickets } = await import(
      '../../services/kitchenPrinting/kitchenFollowUpDispatchService'
    );
    const { Logger } = await import('../../utils/logger');
    const result = await dispatchKitchenFollowUpTickets(pool, {
      establishmentId,
      tableLabel: table?.label ?? null,
      createdByUserId: actor.id,
      logger: Logger.getInstance(),
      items: items.map((item) => ({
        product_id: item.product_id ?? undefined,
        product_name: item.product_name,
        quantity: Number(item.quantity),
        kitchen_printer_ids_snapshot: item.kitchen_printer_ids_snapshot,
        print_pickup_slip_snapshot: item.print_pickup_slip_snapshot,
      })),
    });

    await OpenTicketModel.touchActivity(id, establishmentId);
    return res.json(result);
  })
);

/** À suivre from cart without an open ticket (comptoir). */
router.post(
  '/print-suivre',
  requireAuth,
  requirePosPinActor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const actor = req.pinActor!;
    const rawItems = req.body?.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new ValidationError('items are required');
    }
    const tableLabel =
      typeof req.body?.table_label === 'string' ? req.body.table_label.trim() : null;

    const { dispatchKitchenFollowUpTickets } = await import(
      '../../services/kitchenPrinting/kitchenFollowUpDispatchService'
    );
    const { Logger } = await import('../../utils/logger');
    const result = await dispatchKitchenFollowUpTickets(pool, {
      establishmentId,
      tableLabel: tableLabel || null,
      createdByUserId: actor.id,
      logger: Logger.getInstance(),
      items: rawItems.map((entry: Record<string, unknown>) => ({
        product_id:
          entry.product_id != null && Number.isFinite(Number(entry.product_id))
            ? Number(entry.product_id)
            : undefined,
        product_name: String(entry.product_name ?? 'Article'),
        quantity: Number(entry.quantity) || 1,
        kitchen_printer_ids_snapshot: entry.kitchen_printer_ids_snapshot,
        print_pickup_slip_snapshot: entry.print_pickup_slip_snapshot === true,
        options: [],
      })),
    });
    return res.json(result);
  })
);

export default router;
