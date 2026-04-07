import express from 'express';
import { ProductModel } from '../models';
import { AuditTrailModel } from '../models/auditTrail';
import { getEstablishmentId, requireAuth } from './auth';
import { validateParams, paramValidations } from '../middleware/validation';

const router = express.Router();

router.use(requireAuth);

// GET /api/products
router.get('/', async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const products = await ProductModel.getAll(establishmentId);
    res.json(products);
  } catch {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/archived
router.get('/archived', async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const products = await ProductModel.getAllArchived(establishmentId);
    res.json(products);
  } catch {
    res.status(500).json({ error: 'Failed to fetch archived products' });
  }
});

// GET /api/products/all (active + archived)
router.get('/all', async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const products = await ProductModel.getAllIncludingArchived(establishmentId);
    res.json(products);
  } catch {
    res.status(500).json({ error: 'Failed to fetch all products' });
  }
});

// GET /api/products/category/:categoryId
router.get('/category/:categoryId', validateParams([{ param: 'categoryId', validator: (v: any) => !isNaN(parseInt(v)), message: 'Invalid category ID' }]), async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const categoryId = parseInt(req.params.categoryId);
    const products = await ProductModel.getByCategory(categoryId, establishmentId);
    res.json(products);
  } catch {
    res.status(500).json({ error: 'Failed to fetch products by category' });
  }
});

// GET /api/products/:id
router.get('/:id', validateParams([paramValidations.id]), async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id);
    const product = await ProductModel.getById(id, establishmentId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { name, price, tax_rate, category_id, happy_hour_discount_percent, happy_hour_discount_fixed, is_happy_hour_eligible } = req.body;

    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Product name is required' });
    if (price === undefined || typeof price !== 'number' || price <= 0) return res.status(400).json({ error: 'Valid price is required' });
    if (tax_rate === undefined || typeof tax_rate !== 'number' || tax_rate < 0) return res.status(400).json({ error: 'Valid tax rate is required' });
    if (!category_id || typeof category_id !== 'number') return res.status(400).json({ error: 'Category ID is required' });

    const product = await ProductModel.create(
      { name, price, tax_rate, category_id, happy_hour_discount_percent, happy_hour_discount_fixed, is_happy_hour_eligible: is_happy_hour_eligible !== undefined ? is_happy_hour_eligible : true, is_active: true, establishment_id: establishmentId },
      establishmentId
    );
    await AuditTrailModel.logAction({
      user_id: String(req.user!.id),
      action_type: 'CREATE_PRODUCT',
      resource_type: 'PRODUCT',
      resource_id: String(product.id),
      action_details: { name, price, tax_rate, category_id, establishmentId },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }).catch(() => {});
    res.status(201).json(product);
  } catch {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id
router.put('/:id', validateParams([paramValidations.id]), async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id);
    const updateData: any = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.price !== undefined) updateData.price = req.body.price;
    if (req.body.tax_rate !== undefined) updateData.tax_rate = req.body.tax_rate;
    if (req.body.category_id !== undefined) updateData.category_id = req.body.category_id;
    if (req.body.happy_hour_discount_percent !== undefined) updateData.happy_hour_discount_percent = req.body.happy_hour_discount_percent;
    if (req.body.happy_hour_discount_fixed !== undefined) updateData.happy_hour_discount_fixed = req.body.happy_hour_discount_fixed;
    if (req.body.is_happy_hour_eligible !== undefined) updateData.is_happy_hour_eligible = req.body.is_happy_hour_eligible;
    if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active === true;

    if (Object.keys(updateData).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    const product = await ProductModel.update(id, updateData, establishmentId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await AuditTrailModel.logAction({
      user_id: String(req.user!.id),
      action_type: 'UPDATE_PRODUCT',
      resource_type: 'PRODUCT',
      resource_id: String(id),
      action_details: updateData,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }).catch(() => {});
    res.json(product);
  } catch {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', validateParams([paramValidations.id]), async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id);
    const result = await ProductModel.delete(id, establishmentId);
    if (!result.deleted) return res.status(404).json({ error: 'Product not found or could not be deleted.' });
    await AuditTrailModel.logAction({
      user_id: String(req.user!.id),
      action_type: result.action === 'hard' ? 'DELETE_PRODUCT' : 'ARCHIVE_PRODUCT',
      resource_type: 'PRODUCT',
      resource_id: String(id),
      action_details: { deletion_type: result.action },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }).catch(() => {});
    const message = result.action === 'soft'
      ? 'Produit archivé avec succès (utilisé dans des commandes précédentes)'
      : 'Produit supprimé définitivement avec succès (jamais utilisé)';
    res.json({ message, action: result.action });
  } catch (error: any) {
    const message = error?.code === '23503'
      ? 'Impossible de supprimer le produit : il est référencé dans des commandes existantes.'
      : 'Failed to delete product';
    res.status(500).json({ error: message });
  }
});

// PUT /api/products/:id/restore
router.put('/:id/restore', validateParams([paramValidations.id]), async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const id = parseInt(req.params.id);
    const restored = await ProductModel.restore(id, establishmentId);
    if (!restored) return res.status(404).json({ error: 'Product not found or could not be restored.' });
    await AuditTrailModel.logAction({
      user_id: String(req.user!.id),
      action_type: 'RESTORE_PRODUCT',
      resource_type: 'PRODUCT',
      resource_id: String(id),
      action_details: { product_id: id },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }).catch(() => {});
    res.json({ message: 'Produit restauré avec succès' });
  } catch {
    res.status(500).json({ error: 'Failed to restore product' });
  }
});

export default router;
