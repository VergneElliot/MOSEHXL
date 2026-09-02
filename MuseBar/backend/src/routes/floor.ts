import express from 'express';
import {
  getEstablishmentId,
  requireAuth,
  requirePermission,
  requireEstablishmentAdminOrPermission,
  requireAnyPermission,
} from './auth';
import { P } from '../permissions/registry';
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../middleware/errorHandler';
import { DiningTableModel, FloorPlanModel } from '../models/database/floorModel';
import { OpenTicketModel, type OpenTicketItemInput } from '../models/database/openTicketModel';
import { MembershipModel } from '../models/membership';
import { AuditTrailModel } from '../models/auditTrail';
import { assertCanInterveneOnTicket } from '../services/floor/floorTicketAuth';
import { requirePosPinActor, requirePinActor } from '../middleware/pinActor';
import { pool } from '../db/pool';

const router = express.Router();

function formatUserDisplayName(input: {
  first_name: string | null;
  last_name: string | null;
  email: string;
}): string {
  const parts = [input.first_name, input.last_name].filter((p) => p && String(p).trim());
  return parts.length > 0 ? parts.join(' ') : input.email;
}

async function resolveWaiterDisplayName(userId: number | null): Promise<string | null> {
  if (userId == null) return null;
  const result = await pool.query(
    `SELECT first_name, last_name, email FROM users WHERE id = $1`,
    [userId]
  );
  const row = result.rows[0] as
    | { first_name: string | null; last_name: string | null; email: string }
    | undefined;
  return row ? formatUserDisplayName(row) : null;
}

/** Establishment admins always; otherwise explicit manage_floor_plan (staff). */
const manageFloor = requireEstablishmentAdminOrPermission(P.manage_floor_plan);

/**
 * Plan/table catalog reads: POS (`access_pos`) or floor editors.
 * Establishment admins always pass (Admin canvas without relying on POS perm).
 */
const readFloorCatalog = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (req.user?.role === 'establishment_admin') return next();
  return requireAnyPermission([P.access_pos, P.manage_floor_plan])(req, res, next);
};

function parseShape(value: unknown): 'rectangle' | 'circle' | 'square' {
  if (value === 'rectangle' || value === 'circle' || value === 'square') return value;
  throw new ValidationError('shape must be rectangle, circle, or square');
}

function parseTicketItems(raw: unknown): OpenTicketItemInput[] {
  if (!Array.isArray(raw)) throw new ValidationError('items must be an array');
  return raw.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new ValidationError(`items[${index}] must be an object`);
    }
    const item = entry as Record<string, unknown>;
    const product_name = typeof item.product_name === 'string' ? item.product_name.trim() : '';
    if (!product_name) throw new ValidationError(`items[${index}].product_name is required`);
    const quantity = Number(item.quantity);
    const unit_price = Number(item.unit_price);
    const total_price = Number(item.total_price);
    const tax_rate = Number(item.tax_rate);
    const tax_amount = Number(item.tax_amount);
    if (![quantity, unit_price, total_price, tax_rate, tax_amount].every(Number.isFinite)) {
      throw new ValidationError(`items[${index}] has invalid numeric fields`);
    }
    return {
      product_id: item.product_id == null ? null : Number(item.product_id),
      product_name,
      quantity,
      unit_price,
      total_price,
      tax_rate,
      tax_amount,
      happy_hour_applied: item.happy_hour_applied === true,
      happy_hour_discount_amount: Number(item.happy_hour_discount_amount ?? 0) || 0,
      is_manual_happy_hour: item.is_manual_happy_hour === true,
      description: typeof item.description === 'string' ? item.description : '',
      options_json: item.options_json ?? item.options ?? [],
      kitchen_printer_ids_snapshot: item.kitchen_printer_ids_snapshot ?? [],
      print_pickup_slip_snapshot: item.print_pickup_slip_snapshot === true,
      sort_order: item.sort_order != null ? Number(item.sort_order) : index,
    };
  });
}

// ---------------------------------------------------------------------------
// Floor plans
// ---------------------------------------------------------------------------
router.get(
  '/plans',
  requireAuth,
  readFloorCatalog,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const plans = await FloorPlanModel.list(establishmentId);
    return res.json({ plans });
  })
);

router.post(
  '/plans',
  requireAuth,
  manageFloor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) throw new ValidationError('name is required');
    const plan = await FloorPlanModel.create(establishmentId, {
      name,
      display_order: req.body?.display_order != null ? Number(req.body.display_order) : 0,
      is_active: req.body?.is_active !== false,
    });
    return res.status(201).json({ plan });
  })
);

router.patch(
  '/plans/:id',
  requireAuth,
  manageFloor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid plan id');
    const patch: { name?: string; display_order?: number; is_active?: boolean } = {};
    if (req.body?.name != null) {
      const name = String(req.body.name).trim();
      if (!name) throw new ValidationError('name cannot be empty');
      patch.name = name;
    }
    if (req.body?.display_order != null) patch.display_order = Number(req.body.display_order);
    if (req.body?.is_active != null) patch.is_active = Boolean(req.body.is_active);
    const plan = await FloorPlanModel.update(id, establishmentId, patch);
    if (!plan) throw new NotFoundError('Floor plan not found');
    return res.json({ plan });
  })
);

router.delete(
  '/plans/:id',
  requireAuth,
  manageFloor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid plan id');
    const deleted = await FloorPlanModel.delete(id, establishmentId);
    if (!deleted) throw new NotFoundError('Floor plan not found');
    return res.json({ success: true });
  })
);

// ---------------------------------------------------------------------------
// Dining tables
// ---------------------------------------------------------------------------
router.get(
  '/tables',
  requireAuth,
  readFloorCatalog,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const planId = req.query.plan_id != null ? Number(req.query.plan_id) : undefined;
    if (planId != null && !Number.isInteger(planId)) {
      throw new ValidationError('plan_id must be an integer');
    }
    const tables = await DiningTableModel.list(establishmentId, planId);
    return res.json({ tables });
  })
);

router.get(
  '/status',
  requireAuth,
  requirePermission(P.access_pos),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const tables = await DiningTableModel.listStatus(establishmentId);
    return res.json({ tables });
  })
);

router.get(
  '/ongoing-orders',
  requireAuth,
  requirePermission(P.access_pos),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const summaries = await OpenTicketModel.listOngoingSummaries(establishmentId);
    const orders = await Promise.all(
      summaries.map(async (row) => {
        const waiter_display_name = await resolveWaiterDisplayName(row.waiter_user_id);
        const validatedCount = row.items.filter((i) => i.line_status === 'validated').length;
        const draftCount = row.items.filter((i) => i.line_status === 'draft').length;
        const totalAmount = row.items.reduce((sum, i) => sum + Number(i.total_price), 0);
        return {
          ticket_id: row.ticket_id,
          table_id: row.table_id,
          table_label: row.table_label,
          waiter_user_id: row.waiter_user_id,
          waiter_display_name,
          updated_at: row.ticket_updated_at,
          validated_line_count: validatedCount,
          draft_line_count: draftCount,
          total_amount: totalAmount,
          items: row.items.map((item) => ({
            ...item,
            fulfillment_status:
              item.line_status === 'draft'
                ? 'pending_validation'
                : item.kitchen_sent_at != null
                  ? 'kitchen_sent'
                  : 'validated',
          })),
        };
      })
    );
    return res.json({ orders });
  })
);

router.post(
  '/tables',
  requireAuth,
  manageFloor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const floor_plan_id = Number(req.body?.floor_plan_id);
    const label = typeof req.body?.label === 'string' ? req.body.label.trim() : '';
    if (!Number.isInteger(floor_plan_id)) throw new ValidationError('floor_plan_id is required');
    if (!label) throw new ValidationError('label is required');
    const plan = await FloorPlanModel.get(floor_plan_id, establishmentId);
    if (!plan) throw new NotFoundError('Floor plan not found');
    try {
      const table = await DiningTableModel.create(establishmentId, {
        floor_plan_id,
        label,
        pos_x: req.body?.pos_x != null ? Number(req.body.pos_x) : 0,
        pos_y: req.body?.pos_y != null ? Number(req.body.pos_y) : 0,
        width: req.body?.width != null ? Number(req.body.width) : 80,
        height: req.body?.height != null ? Number(req.body.height) : 80,
        capacity: req.body?.capacity != null ? Number(req.body.capacity) : null,
        shape: req.body?.shape != null ? parseShape(req.body.shape) : 'rectangle',
        sort_order: req.body?.sort_order != null ? Number(req.body.sort_order) : 0,
        is_active: req.body?.is_active !== false,
      });
      return res.status(201).json({ table });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (
        message.includes('dining_tables_label_unique_per_establishment') ||
        message.includes('dining_tables_label_unique_per_plan')
      ) {
        throw new ConflictError('A table with this label already exists in this establishment');
      }
      throw error;
    }
  })
);

router.patch(
  '/tables/:id',
  requireAuth,
  manageFloor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid table id');
    const patch: Parameters<typeof DiningTableModel.update>[2] = {};
    if (req.body?.label != null) {
      const label = String(req.body.label).trim();
      if (!label) throw new ValidationError('label cannot be empty');
      patch.label = label;
    }
    for (const key of ['pos_x', 'pos_y', 'width', 'height', 'capacity', 'sort_order', 'floor_plan_id'] as const) {
      if (req.body?.[key] != null) (patch as Record<string, unknown>)[key] = Number(req.body[key]);
    }
    if (req.body?.shape != null) patch.shape = parseShape(req.body.shape);
    if (req.body?.is_active != null) patch.is_active = Boolean(req.body.is_active);
    try {
      const table = await DiningTableModel.update(id, establishmentId, patch);
      if (!table) throw new NotFoundError('Dining table not found');
      return res.json({ table });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      const message = error instanceof Error ? error.message : '';
      if (
        message.includes('dining_tables_label_unique_per_establishment') ||
        message.includes('dining_tables_label_unique_per_plan')
      ) {
        throw new ConflictError('A table with this label already exists in this establishment');
      }
      throw error;
    }
  })
);

router.delete(
  '/tables/:id',
  requireAuth,
  manageFloor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid table id');
    try {
      const deleted = await DiningTableModel.delete(id, establishmentId);
      if (!deleted) throw new NotFoundError('Dining table not found');
      return res.json({ success: true });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      const message = error instanceof Error ? error.message : '';
      if (message.includes('open_tickets_dining_table_id_fkey') || message.includes('RESTRICT')) {
        throw new ConflictError('Cannot delete a table that still has ticket history; deactivate it instead');
      }
      throw error;
    }
  })
);

// ---------------------------------------------------------------------------
// Open tickets (PIN actor required)
// ---------------------------------------------------------------------------
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
    const existing = await OpenTicketModel.getOpenForTable(dining_table_id, establishmentId);
    if (existing) {
      throw new ConflictError('Table already has an open ticket');
    }
    try {
      const ticket = await OpenTicketModel.create(establishmentId, {
        dining_table_id,
        opened_by_user_id: actor.id,
        covers: req.body?.covers != null ? Number(req.body.covers) : null,
        notes: typeof req.body?.notes === 'string' ? req.body.notes : null,
      });
      return res.status(201).json({ ticket, items: [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('idx_open_tickets_one_open_per_table')) {
        throw new ConflictError('Table already has an open ticket');
      }
      throw error;
    }
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

router.put(
  '/tickets/:id/items',
  requireAuth,
  requirePosPinActor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const actor = req.pinActor!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid ticket id');
    const items = parseTicketItems(req.body?.items);
    try {
      const ticket = await OpenTicketModel.get(id, establishmentId);
      if (!ticket || ticket.status !== 'open') {
        throw new NotFoundError('Open ticket not found or already closed');
      }
      assertCanInterveneOnTicket(ticket, actor);
      const saved = await OpenTicketModel.syncDraftItems(id, establishmentId, items);
      const updatedTicket = await OpenTicketModel.get(id, establishmentId);
      return res.json({ ticket: updatedTicket, items: saved });
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
  '/tickets/:id/validate',
  requireAuth,
  requirePosPinActor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const actor = req.pinActor!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid ticket id');
    const ticket = await OpenTicketModel.get(id, establishmentId);
    if (!ticket || ticket.status !== 'open') {
      throw new NotFoundError('Open ticket not found or already closed');
    }
    assertCanInterveneOnTicket(ticket, actor);
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
        '../services/kitchenPrinting/kitchenFollowUpDispatchService'
      );
      const { Logger } = await import('../utils/logger');
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
      const ticket = await OpenTicketModel.get(id, establishmentId);
      if (!ticket || ticket.status !== 'open') {
        throw new NotFoundError('Open ticket not found or already closed');
      }
      assertCanInterveneOnTicket(ticket, actor);
      const items = await OpenTicketModel.discardDraftItems(id, establishmentId);
      const updatedTicket = await OpenTicketModel.get(id, establishmentId);
      return res.json({ ticket: updatedTicket, items });
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

    const ticket = await OpenTicketModel.get(id, establishmentId);
    if (!ticket || ticket.status !== 'open') {
      throw new NotFoundError('Open ticket not found or already closed');
    }
    assertCanInterveneOnTicket(ticket, actor);
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
        '../services/kitchenPrinting/kitchenRetourDispatchService'
      );
      const { Logger } = await import('../utils/logger');
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
  '/tickets/:id/abandon',
  requireAuth,
  requirePosPinActor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const actor = req.pinActor!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid ticket id');
    const ticket = await OpenTicketModel.abandon(id, establishmentId, actor.id);
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
    const ticket = await OpenTicketModel.closeWithOrder(id, establishmentId, orderId, actor.id);
    if (!ticket) throw new NotFoundError('Open ticket not found or already closed');
    return res.json({ ticket });
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

    const sourceTicket = await OpenTicketModel.get(id, establishmentId);
    if (!sourceTicket || sourceTicket.status !== 'open') {
      throw new NotFoundError('Open ticket not found or already closed');
    }
    assertCanInterveneOnTicket(sourceTicket, actor);

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
    const existing = await OpenTicketModel.get(id, establishmentId);
    if (!existing || existing.status !== 'open') {
      throw new NotFoundError('Open ticket not found or already closed');
    }
    assertCanInterveneOnTicket(existing, actor);
    try {
      const ticket = await OpenTicketModel.transferTable(id, establishmentId, diningTableId, actor.id);
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
  '/tickets/:id/takeover',
  requireAuth,
  requirePosPinActor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const actor = req.pinActor!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid ticket id');
    const ticket = await OpenTicketModel.takeover(id, establishmentId, actor.id);
    if (!ticket) throw new NotFoundError('Open ticket not found or already closed');
    const served_by_display_name = await resolveWaiterDisplayName(ticket.last_served_by_user_id);
    return res.json({ ticket, served_by_display_name });
  })
);

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
    const sourceTicket = await OpenTicketModel.get(id, establishmentId);
    if (!sourceTicket || sourceTicket.status !== 'open') {
      throw new NotFoundError('Open ticket not found or already closed');
    }
    assertCanInterveneOnTicket(sourceTicket, actor);
    try {
      const result = await OpenTicketModel.mergeInto(id, targetTicketId, establishmentId, actor.id);
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
    const ticket = await OpenTicketModel.get(id, establishmentId);
    if (!ticket || ticket.status !== 'open') {
      throw new NotFoundError('Open ticket not found or already closed');
    }
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
      '../services/kitchenPrinting/kitchenFollowUpDispatchService'
    );
    const { Logger } = await import('../utils/logger');
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

    await OpenTicketModel.touchServer(id, establishmentId, actor.id);
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
      '../services/kitchenPrinting/kitchenFollowUpDispatchService'
    );
    const { Logger } = await import('../utils/logger');
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
