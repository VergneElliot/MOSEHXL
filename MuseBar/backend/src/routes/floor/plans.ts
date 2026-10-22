import express from 'express';
import { getEstablishmentId, requireAuth } from '../auth';
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
} from '../../middleware/errorHandler';
import { FloorPlanModel } from '../../models/database/floorModel';
import { manageFloor, readFloorCatalog } from './shared';

const router = express.Router();

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

export default router;
