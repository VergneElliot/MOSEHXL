import express from 'express';
import { getEstablishmentId, requireAuth, requirePermission } from './auth';
import { P } from '../permissions/registry';
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../middleware/errorHandler';
import { DiningTableModel, FloorPlanModel } from '../models/database/floorModel';
import { OpenTicketModel, type OpenTicketItemInput } from '../models/database/openTicketModel';
import { requirePosPinActor } from '../middleware/pinActor';

const router = express.Router();

const manageFloor = requirePermission(P.manage_floor_plan);

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
  requirePermission(P.access_pos),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req);
    const plans = await FloorPlanModel.list(establishmentId);
    return res.json({ plans });
  })
);

router.post(
  '/plans',
  requireAuth,
  manageFloor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req);
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
    const establishmentId = getEstablishmentId(req);
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
    const establishmentId = getEstablishmentId(req);
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
  requirePermission(P.access_pos),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req);
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
    const establishmentId = getEstablishmentId(req);
    const tables = await DiningTableModel.listStatus(establishmentId);
    return res.json({ tables });
  })
);

router.post(
  '/tables',
  requireAuth,
  manageFloor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req);
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
      if (message.includes('dining_tables_label_unique_per_plan')) {
        throw new ConflictError('A table with this label already exists on this plan');
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
    const establishmentId = getEstablishmentId(req);
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
      if (message.includes('dining_tables_label_unique_per_plan')) {
        throw new ConflictError('A table with this label already exists on this plan');
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
    const establishmentId = getEstablishmentId(req);
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
    const establishmentId = getEstablishmentId(req);
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
    const establishmentId = getEstablishmentId(req);
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid ticket id');
    const ticket = await OpenTicketModel.get(id, establishmentId);
    if (!ticket) throw new NotFoundError('Open ticket not found');
    const items = await OpenTicketModel.listItems(id, establishmentId);
    return res.json({ ticket, items });
  })
);

router.put(
  '/tickets/:id/items',
  requireAuth,
  requirePosPinActor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req);
    const actor = req.pinActor!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid ticket id');
    const items = parseTicketItems(req.body?.items);
    try {
      const saved = await OpenTicketModel.replaceItems(id, establishmentId, items, actor.id);
      const ticket = await OpenTicketModel.get(id, establishmentId);
      return res.json({ ticket, items: saved });
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
  '/tickets/:id/abandon',
  requireAuth,
  requirePosPinActor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req);
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
    const establishmentId = getEstablishmentId(req);
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

export default router;
