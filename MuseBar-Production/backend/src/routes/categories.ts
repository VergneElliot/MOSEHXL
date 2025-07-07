import express from 'express';
import { CategoryModel } from '../models';
import { AuditTrailModel } from '../models/auditTrail';
import { requireAuth } from './auth';

const router = express.Router();

// GET all categories
router.get('/', async (req, res) => {
  try {
    const categories = await CategoryModel.getAll();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET archived categories
router.get('/archived', async (req, res) => {
  try {
    const categories = await CategoryModel.getAllArchived();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching archived categories:', error);
    res.status(500).json({ error: 'Failed to fetch archived categories' });
  }
});

// GET all categories including archived
router.get('/all', async (req, res) => {
  try {
    const categories = await CategoryModel.getAllIncludingArchived();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching all categories:', error);
    res.status(500).json({ error: 'Failed to fetch all categories' });
  }
});

// GET category by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const category = await CategoryModel.getById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// POST create new category
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, default_tax_rate } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Category name is required' });
    }

    if (default_tax_rate === undefined || typeof default_tax_rate !== 'number') {
      return res.status(400).json({ error: 'Default tax rate is required and must be a number' });
    }

    const category = await CategoryModel.create(name, default_tax_rate);

    // Log audit trail
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = req.user ? String(req.user.id) : undefined;
    await AuditTrailModel.logAction({
      user_id: userId,
      action_type: 'CREATE_CATEGORY',
      resource_type: 'CATEGORY',
      resource_id: String(category.id),
      action_details: { name, default_tax_rate },
      ip_address: ip,
      user_agent: userAgent
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT update category
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const { name, default_tax_rate } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Category name is required' });
    }

    if (default_tax_rate === undefined || typeof default_tax_rate !== 'number') {
      return res.status(400).json({ error: 'Default tax rate is required and must be a number' });
    }

    const category = await CategoryModel.update(id, name, default_tax_rate);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Log audit trail
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = req.user ? String(req.user.id) : undefined;
    await AuditTrailModel.logAction({
      user_id: userId,
      action_type: 'UPDATE_CATEGORY',
      resource_type: 'CATEGORY',
      resource_id: String(id),
      action_details: { name, default_tax_rate },
      ip_address: ip,
      user_agent: userAgent
    });

    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE category
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const result = await CategoryModel.delete(id);
    if (!result.deleted) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Log audit trail with appropriate action type
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = req.user ? String(req.user.id) : undefined;
    
    const actionType = result.action === 'hard' ? 'DELETE_CATEGORY' : 'ARCHIVE_CATEGORY';
    
    try {
      await AuditTrailModel.logAction({
        user_id: userId,
        action_type: actionType,
        resource_type: 'CATEGORY',
        resource_id: String(id),
        action_details: { 
          category_id: id, 
          deletion_type: result.action,
          reason: result.reason 
        },
        ip_address: ip,
        user_agent: userAgent
      });
    } catch (error) {
      console.error('Audit log error:', error);
    }

    // User-friendly response messages
    const message = result.action === 'hard' 
      ? 'Catégorie supprimée définitivement avec succès'
      : 'Catégorie archivée avec succès (préservation légale requise)';

    res.json({ 
      message,
      action: result.action,
      reason: result.reason
    });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    
    // User-friendly error messages
    let message = 'Échec de la suppression de la catégorie.';
    let statusCode = 500;
    
    if (error && error.message) {
      if (error.message.includes('contains products')) {
        message = 'Impossible de supprimer la catégorie : elle contient encore des produits. Veuillez d\'abord supprimer ou déplacer tous les produits.';
        statusCode = 400;
      } else {
        message = error.message;
      }
    }
    
    res.status(statusCode).json({ error: message });
  }
});

// POST restore category
router.post('/:id/restore', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const restored = await CategoryModel.restore(id);
    if (!restored) {
      return res.status(404).json({ error: 'Category not found or already active' });
    }

    // Log audit trail
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const userId = req.user ? String(req.user.id) : undefined;
    
    try {
      await AuditTrailModel.logAction({
        user_id: userId,
        action_type: 'RESTORE_CATEGORY',
        resource_type: 'CATEGORY',
        resource_id: String(id),
        action_details: { category_id: id },
        ip_address: ip,
        user_agent: userAgent
      });
    } catch (error) {
      console.error('Audit log error:', error);
    }

    res.json({ message: 'Catégorie restaurée avec succès' });
  } catch (error) {
    console.error('Error restoring category:', error);
    res.status(500).json({ error: 'Échec de la restauration de la catégorie' });
  }
});

export default router; 