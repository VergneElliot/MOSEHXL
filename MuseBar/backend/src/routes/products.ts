import express from 'express';
import { ProductModel } from '../models';
import { ProductOptionGroupModel } from '../models/database/productOptionGroupModel';
import { AuditTrailModel } from '../models/auditTrail';
import { enrichProductsWithOptionCatalog } from '../services/productOptions/productOptionCatalogService';
import { getEstablishmentId, requireAuth, requireAnyPermission, requirePermission } from './auth';
import { P } from '../permissions/registry';
import { validateParams, paramValidations } from '../middleware/validation';
import { Logger } from '../utils/logger';
import { AppError, asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';

const router = express.Router();

const readCatalog = requireAnyPermission([P.access_pos, P.access_menu]);
const menuWrite = requirePermission(P.access_menu);

function parseOptionGroupIds(value: unknown): number[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new ValidationError('option_group_ids must be an array');
  const ids = value.map((entry) => {
    const id = Number(entry);
    if (!Number.isInteger(id) || id < 1) throw new ValidationError('option_group_ids contains an invalid id');
    return id;
  });
  return [...new Set(ids)];
}

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
      'PRODUCTS_ROUTE'
    );
    throw new AppError('Failed to persist audit trail entry', 500, 'AUDIT_LOG_FAILURE', { context });
  }
}

router.use(requireAuth);

// GET /api/products
router.get('/', readCatalog, asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const products = await ProductModel.getAll(establishmentId);
    res.json(await enrichProductsWithOptionCatalog(products, establishmentId));
  } catch {
    throw new AppError('Failed to fetch products', 500, 'PRODUCTS_FETCH_FAILED');
  }
}));

// GET /api/products/archived
router.get('/archived', readCatalog, asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const products = await ProductModel.getAllArchived(establishmentId);
    res.json(await enrichProductsWithOptionCatalog(products, establishmentId));
  } catch {
    throw new AppError('Failed to fetch archived products', 500, 'PRODUCTS_ARCHIVED_FETCH_FAILED');
  }
}));

// GET /api/products/all (active + archived)
router.get('/all', readCatalog, asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const products = await ProductModel.getAllIncludingArchived(establishmentId);
    res.json(await enrichProductsWithOptionCatalog(products, establishmentId));
  } catch {
    throw new AppError('Failed to fetch all products', 500, 'PRODUCTS_ALL_FETCH_FAILED');
  }
}));

// GET /api/products/category/:categoryId
router.get(
  '/category/:categoryId',
  readCatalog,
  validateParams([{ param: 'categoryId', validator: (v: string) => !isNaN(parseInt(v, 10)), message: 'Invalid category ID' }]),
  asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const categoryId = parseInt(req.params.categoryId ?? '', 10);
    const products = await ProductModel.getByCategory(categoryId, establishmentId);
    res.json(await enrichProductsWithOptionCatalog(products, establishmentId));
  } catch {
    throw new AppError('Failed to fetch products by category', 500, 'PRODUCTS_BY_CATEGORY_FETCH_FAILED');
  }
  })
);

// GET /api/products/:id
router.get('/:id', readCatalog, validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id ?? '', 10);
    const product = await ProductModel.getById(id, establishmentId);
    if (!product) throw new NotFoundError('Product');
    const [enriched] = await enrichProductsWithOptionCatalog([product], establishmentId);
    res.json(enriched);
  } catch {
    throw new AppError('Failed to fetch product', 500, 'PRODUCT_FETCH_FAILED');
  }
}));

// POST /api/products
router.post('/', menuWrite, asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { name, price, tax_rate, category_id, happy_hour_discount_percent, happy_hour_discount_fixed, is_happy_hour_eligible, option_group_ids } = req.body;
    const parsedOptionGroupIds = parseOptionGroupIds(option_group_ids);

    if (!name || typeof name !== 'string') throw new ValidationError('Product name is required');
    if (price === undefined || typeof price !== 'number' || price <= 0) throw new ValidationError('Valid price is required');
    if (tax_rate === undefined || typeof tax_rate !== 'number' || tax_rate < 0) throw new ValidationError('Valid tax rate is required');
    if (!category_id || typeof category_id !== 'number') throw new ValidationError('Category ID is required');

    const product = await ProductModel.create(
      { name, price, tax_rate, category_id, happy_hour_discount_percent, happy_hour_discount_fixed, is_happy_hour_eligible: is_happy_hour_eligible !== undefined ? is_happy_hour_eligible : true, is_active: true, establishment_id: establishmentId },
      establishmentId
    );
    if (parsedOptionGroupIds) {
      await ProductOptionGroupModel.setProductAssignments(product.id, parsedOptionGroupIds, establishmentId);
    }
    const [enriched] = await enrichProductsWithOptionCatalog([product], establishmentId);
    await logAuditOrThrow({
      user_id: String(req.user!.id),
      action_type: 'CREATE_PRODUCT',
      resource_type: 'PRODUCT',
      resource_id: String(product.id),
      action_details: { name, price, tax_rate, category_id, option_group_ids: parsedOptionGroupIds, establishmentId },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, 'CREATE_PRODUCT');
    res.status(201).json(enriched);
  } catch (error) {
    if (error instanceof AppError) throw error;
    Logger.getInstance().error('Create product failed', error as Error, 'PRODUCTS_ROUTE');
    throw new AppError('Failed to create product', 500, 'PRODUCT_CREATE_FAILED');
  }
}));

// PUT /api/products/:id
router.put('/:id', menuWrite, validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id ?? '', 10);
    const updateData: Record<string, unknown> = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.price !== undefined) updateData.price = req.body.price;
    if (req.body.tax_rate !== undefined) updateData.tax_rate = req.body.tax_rate;
    if (req.body.category_id !== undefined) updateData.category_id = req.body.category_id;
    if (req.body.happy_hour_discount_percent !== undefined) updateData.happy_hour_discount_percent = req.body.happy_hour_discount_percent;
    if (req.body.happy_hour_discount_fixed !== undefined) updateData.happy_hour_discount_fixed = req.body.happy_hour_discount_fixed;
    if (req.body.is_happy_hour_eligible !== undefined) updateData.is_happy_hour_eligible = req.body.is_happy_hour_eligible;
    if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active === true;
    const parsedOptionGroupIds = parseOptionGroupIds(req.body.option_group_ids);

    if (Object.keys(updateData).length === 0 && parsedOptionGroupIds === undefined) {
      throw new ValidationError('No valid fields to update');
    }

    const product = Object.keys(updateData).length > 0
      ? await ProductModel.update(id, updateData, establishmentId)
      : await ProductModel.getById(id, establishmentId);
    if (!product) throw new NotFoundError('Product');
    if (parsedOptionGroupIds !== undefined) {
      await ProductOptionGroupModel.setProductAssignments(id, parsedOptionGroupIds, establishmentId);
    }
    const [enriched] = await enrichProductsWithOptionCatalog([product], establishmentId);
    await logAuditOrThrow({
      user_id: String(req.user!.id),
      action_type: 'UPDATE_PRODUCT',
      resource_type: 'PRODUCT',
      resource_id: String(id),
      action_details: { ...updateData, option_group_ids: parsedOptionGroupIds },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, 'UPDATE_PRODUCT');
    res.json(enriched);
  } catch (error) {
    if (error instanceof AppError) throw error;
    Logger.getInstance().error('Update product failed', error as Error, 'PRODUCTS_ROUTE');
    throw new AppError('Failed to update product', 500, 'PRODUCT_UPDATE_FAILED');
  }
}));

// DELETE /api/products/:id
router.delete('/:id', menuWrite, validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id ?? '', 10);
    const result = await ProductModel.delete(id, establishmentId);
    if (!result.deleted) throw new NotFoundError('Product');
    await logAuditOrThrow({
      user_id: String(req.user!.id),
      action_type: result.action === 'hard' ? 'DELETE_PRODUCT' : 'ARCHIVE_PRODUCT',
      resource_type: 'PRODUCT',
      resource_id: String(id),
      action_details: { deletion_type: result.action },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, 'DELETE_OR_ARCHIVE_PRODUCT');
    const message = result.action === 'soft'
      ? 'Produit archivé avec succès (utilisé dans des commandes précédentes)'
      : 'Produit supprimé définitivement avec succès (jamais utilisé)';
    res.json({ message, action: result.action });
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    const e = error as { code?: unknown };
    const message = e?.code === '23503'
      ? 'Impossible de supprimer le produit : il est référencé dans des commandes existantes.'
      : 'Failed to delete product';
    throw new AppError(message, 500, 'PRODUCT_DELETE_FAILED');
  }
}));

// PUT /api/products/:id/restore
router.put('/:id/restore', menuWrite, validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id ?? '', 10);
    const restored = await ProductModel.restore(id, establishmentId);
    if (!restored) throw new NotFoundError('Product');
    await logAuditOrThrow({
      user_id: String(req.user!.id),
      action_type: 'RESTORE_PRODUCT',
      resource_type: 'PRODUCT',
      resource_id: String(id),
      action_details: { product_id: id },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }, 'RESTORE_PRODUCT');
    res.json({ message: 'Produit restauré avec succès' });
  } catch (error) {
    if (error instanceof AppError) throw error;
    Logger.getInstance().error('Restore product failed', error as Error, 'PRODUCTS_ROUTE');
    throw new AppError('Failed to restore product', 500, 'PRODUCT_RESTORE_FAILED');
  }
}));

export default router;
