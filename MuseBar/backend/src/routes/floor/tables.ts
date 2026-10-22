import express from 'express';
import { getEstablishmentId, requireAuth, requirePermission } from '../auth';
import { P } from '../../permissions/registry';
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../../middleware/errorHandler';
import { DiningTableModel, FloorPlanModel } from '../../models/database/floorModel';
import { manageFloor, parseShape, readFloorCatalog } from './shared';

const router = express.Router();

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

export default router;
