import express from 'express';
import { ProductModel } from '../models';
import { AuditTrailModel } from '../models/auditTrail';
import { requireAuth } from './auth';
import { pool } from '../app';

const router = express.Router();

// GET all products
router.get('/', async (req, res) => {
  try {
    const products = await ProductModel.getAll();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET archived products
router.get('/archived', async (req, res) => {
  try {
    const products = await ProductModel.getAllArchived();
    res.json(products);
  } catch (error) {
    console.error('Error fetching archived products:', error);
    res.status(500).json({ error: 'Failed to fetch archived products' });
  }
});

// GET all products including archived
router.get('/all', async (req, res) => {
  try {
    const products = await ProductModel.getAllIncludingArchived();
    res.json(products);
  } catch (error) {
    console.error('Error fetching all products:', error);
    res.status(500).json({ error: 'Failed to fetch all products' });
  }
});

// GET products by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const products = await ProductModel.getByCategory(categoryId);
    res.json(products);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ error: 'Failed to fetch products by category' });
  }
});

// GET product by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await ProductModel.getById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST create new product
router.post('/', requireAuth, async (req, res) => {
  try {
    const { 
      name, 
      price, 
      tax_rate, 
      category_id, 
      happy_hour_discount_percent, 
      happy_hour_discount_fixed, 
      is_happy_hour_eligible 
    } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Product name is required' });
    }

    if (price === undefined || typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }

    if (tax_rate === undefined || typeof tax_rate !== 'number' || tax_rate < 0) {
      return res.status(400).json({ error: 'Valid tax rate is required' });
    }

    if (!category_id || typeof category_id !== 'number') {
      return res.status(400).json({ error: 'Category ID is required' });
    }

    const product = await ProductModel.create({
      name,
      price,
      tax_rate,
      category_id,
      happy_hour_discount_percent,
      happy_hour_discount_fixed,
      is_happy_hour_eligible: is_happy_hour_eligible !== undefined ? is_happy_hour_eligible : true,
      is_active: true
    });

    // Log audit trail
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = (req as any).user ? String((req as any).user.id) : undefined;
    await AuditTrailModel.logAction({
      user_id: userId,
      action_type: 'CREATE_PRODUCT',
      resource_type: 'PRODUCT',
      resource_id: String(product.id),
      action_details: { name, price, tax_rate, category_id, happy_hour_discount_percent, happy_hour_discount_fixed, is_happy_hour_eligible },
      ip_address: ip,
      user_agent: userAgent
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT update product
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const updateData: any = {};
    
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.price !== undefined) updateData.price = req.body.price;
    if (req.body.tax_rate !== undefined) updateData.tax_rate = req.body.tax_rate;
    if (req.body.category_id !== undefined) updateData.category_id = req.body.category_id;
    if (req.body.happy_hour_discount_percent !== undefined) updateData.happy_hour_discount_percent = req.body.happy_hour_discount_percent;
    if (req.body.happy_hour_discount_fixed !== undefined) updateData.happy_hour_discount_fixed = req.body.happy_hour_discount_fixed;
    if (req.body.is_happy_hour_eligible !== undefined) updateData.is_happy_hour_eligible = req.body.is_happy_hour_eligible;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const product = await ProductModel.update(id, updateData);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Log audit trail
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = (req as any).user ? String((req as any).user.id) : undefined;
    await AuditTrailModel.logAction({
      user_id: userId,
      action_type: 'UPDATE_PRODUCT',
      resource_type: 'PRODUCT',
      resource_id: String(id),
      action_details: updateData,
      ip_address: ip,
      user_agent: userAgent
    });

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE product
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    // Check if product is referenced in order_items to determine deletion type
    const orderItemsResult = await pool.query('SELECT COUNT(*) FROM order_items WHERE product_id = $1', [id]);
    const hasOrderItems = parseInt(orderItemsResult.rows[0].count, 10) > 0;

    const deleted = await ProductModel.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found or could not be deleted.' });
    }

    // Log audit trail
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = (req as any).user ? String((req as any).user.id) : undefined;
    
    try {
      await AuditTrailModel.logAction({
        user_id: userId,
        action_type: hasOrderItems ? 'ARCHIVE_PRODUCT' : 'DELETE_PRODUCT',
        resource_type: 'PRODUCT',
        resource_id: String(id),
        action_details: { 
          product_id: id, 
          deletion_type: hasOrderItems ? 'soft_delete' : 'hard_delete',
          reason: hasOrderItems ? 'Product used in orders' : 'Product never used'
        },
        ip_address: ip,
        user_agent: userAgent
      });
    } catch (error) {
      console.error('Audit log error:', error);
    }

    const message = hasOrderItems 
      ? 'Produit archivé avec succès (utilisé dans des commandes précédentes)' 
      : 'Produit supprimé définitivement avec succès (jamais utilisé)';
    
    res.json({ 
      message,
      action: hasOrderItems ? 'soft' : 'hard',
      reason: hasOrderItems ? 'Product used in orders' : 'Product never used'
    });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    let message = 'Échec de la suppression du produit.';
    if (error && error.code === '23503') {
      message = 'Impossible de supprimer le produit : il est référencé dans des commandes existantes.';
    } else if (error && error.message) {
      message = error.message;
    }
    res.status(500).json({ error: message });
  }
});

// PUT restore archived product
router.put('/:id/restore', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const restored = await ProductModel.restore(id);
    if (!restored) {
      return res.status(404).json({ error: 'Product not found or could not be restored.' });
    }

    // Log audit trail
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = (req as any).user ? String((req as any).user.id) : undefined;
    
    try {
      await AuditTrailModel.logAction({
        user_id: userId,
        action_type: 'RESTORE_PRODUCT',
        resource_type: 'PRODUCT',
        resource_id: String(id),
        action_details: { product_id: id },
        ip_address: ip,
        user_agent: userAgent
      });
    } catch (error) {
      console.error('Audit log error:', error);
    }

    res.json({ message: 'Produit restauré avec succès' });
  } catch (error: any) {
    console.error('Error restoring product:', error);
    res.status(500).json({ error: 'Échec de la restauration du produit.' });
  }
});

export default router; 