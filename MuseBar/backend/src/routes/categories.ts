import express from 'express';
import { CategoryModel } from '../models';
import { AuditTrailModel } from '../models/auditTrail';
import { getEstablishmentId, requireAuth, requireAnyPermission, requirePermission } from './auth';
import { P } from '../permissions/registry';
import { validateBody, validateParams, commonValidations, paramValidations } from '../middleware/validation';
import { Logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

const readCatalog = requireAnyPermission([P.access_pos, P.access_menu]);
const menuWrite = requirePermission(P.access_menu);

async function logAuditOrThrow(
  entry: Parameters<typeof AuditTrailModel.logAction>[0],
  context: string
): Promise<void> {
  try {
    await AuditTrailModel.logAction(entry);
  } catch (error) {
    Logger.getInstance().error(
      `Audit trail logging failed (${context})`,
      error as Error,
      'CATEGORIES_ROUTE'
    );
    throw new AppError('Failed to persist audit trail entry', 500, 'AUDIT_LOG_FAILURE', { context });
  }
}

router.use(requireAuth);

// GET /api/categories
router.get('/', readCatalog, asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const categories = await CategoryModel.getAll(establishmentId);
    res.json(categories);
  } catch {
    throw new AppError('Failed to fetch categories', 500, 'CATEGORIES_FETCH_FAILED');
  }
}));

// GET /api/categories/archived
router.get('/archived', readCatalog, asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const categories = await CategoryModel.getAllArchived(establishmentId);
    res.json(categories);
  } catch {
    throw new AppError('Failed to fetch archived categories', 500, 'CATEGORIES_ARCHIVED_FETCH_FAILED');
  }
}));

// GET /api/categories/all (active + archived)
router.get('/all', readCatalog, asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const categories = await CategoryModel.getAllIncludingArchived(establishmentId);
    res.json(categories);
  } catch {
    throw new AppError('Failed to fetch all categories', 500, 'CATEGORIES_ALL_FETCH_FAILED');
  }
}));

// GET /api/categories/:id
router.get('/:id', readCatalog, validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id ?? '', 10);
    const category = await CategoryModel.getById(id, establishmentId);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch {
    throw new AppError('Failed to fetch category', 500, 'CATEGORY_FETCH_FAILED');
  }
}));

// POST /api/categories
router.post('/', menuWrite, validateBody(commonValidations.categoryCreate), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { name, default_tax_rate, color } = req.body;
    const category = await CategoryModel.create(name, default_tax_rate, color || '#1976d2', establishmentId);
    await logAuditOrThrow({
      user_id: String(req.user!.id),
      action_type: 'CREATE_CATEGORY',
      resource_type: 'CATEGORY',
      resource_id: String(category.id),
      action_details: { name, default_tax_rate, color, establishmentId },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, 'CREATE_CATEGORY');
    res.status(201).json(category);
  } catch (error) {
    Logger.getInstance().error('Create category failed', error as Error, 'CATEGORIES_ROUTE');
    throw new AppError('Failed to create category', 500, 'CATEGORY_CREATE_FAILED');
  }
}));

// PUT /api/categories/:id
router.put('/:id', menuWrite, validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id ?? '', 10);
    const { name, default_tax_rate, color, is_active } = req.body;
    const category = await CategoryModel.update(
      id,
      name,
      default_tax_rate != null ? default_tax_rate : undefined,
      color ?? undefined,
      establishmentId,
      is_active
    );
    if (!category) return res.status(404).json({ error: 'Category not found' });
    await logAuditOrThrow({
      user_id: String(req.user!.id),
      action_type: 'UPDATE_CATEGORY',
      resource_type: 'CATEGORY',
      resource_id: String(id),
      action_details: { name, default_tax_rate, color, is_active },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, 'UPDATE_CATEGORY');
    res.json(category);
  } catch (error) {
    Logger.getInstance().error('Update category failed', error as Error, 'CATEGORIES_ROUTE');
    throw new AppError('Failed to update category', 500, 'CATEGORY_UPDATE_FAILED');
  }
}));

// DELETE /api/categories/:id
router.delete('/:id', menuWrite, validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id ?? '', 10);
    const result = await CategoryModel.delete(id, establishmentId);
    if (!result.deleted) return res.status(404).json({ error: 'Category not found' });
    await logAuditOrThrow({
      user_id: String(req.user!.id),
      action_type: result.action === 'hard' ? 'DELETE_CATEGORY' : 'ARCHIVE_CATEGORY',
      resource_type: 'CATEGORY',
      resource_id: String(id),
      action_details: { deletion_type: result.action, reason: result.reason },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, 'DELETE_OR_ARCHIVE_CATEGORY');
    const message = result.action === 'hard'
      ? 'Catégorie supprimée définitivement avec succès'
      : 'Catégorie archivée avec succès (préservation légale requise)';
    res.json({ message, action: result.action, reason: result.reason });
  } catch (error) {
    Logger.getInstance().error('Delete category failed', error as Error, 'CATEGORIES_ROUTE');
    throw new AppError('Failed to delete category', 500, 'CATEGORY_DELETE_FAILED');
  }
}));

// POST /api/categories/:id/restore
router.post('/:id/restore', menuWrite, validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id ?? '', 10);
    const restored = await CategoryModel.restore(id, establishmentId);
    if (!restored) return res.status(404).json({ error: 'Category not found or already active' });
    await logAuditOrThrow({
      user_id: String(req.user!.id),
      action_type: 'RESTORE_CATEGORY',
      resource_type: 'CATEGORY',
      resource_id: String(id),
      action_details: { category_id: id },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, 'RESTORE_CATEGORY');
    res.json({ message: 'Catégorie restaurée avec succès' });
  } catch (error) {
    Logger.getInstance().error('Restore category failed', error as Error, 'CATEGORIES_ROUTE');
    throw new AppError('Failed to restore category', 500, 'CATEGORY_RESTORE_FAILED');
  }
}));

export default router;
