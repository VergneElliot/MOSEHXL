/**
 * Establishments Routes
 * Single router for /api/establishments: list, get, delete, create (enhanced and legacy).
 */

import express from 'express';
import { requireAuth, requireAdmin } from './auth';
import { pool } from '../app';
import {
  EstablishmentCreationOrchestrator,
  EstablishmentService,
} from '../services/establishment';
import { validateParams, paramValidations } from '../middleware/validation';
import { Logger } from '../utils/logger';
import { getEnvironmentConfig } from '../config/environment';

const router = express.Router();
const config = getEnvironmentConfig();
const logger = Logger.getInstance(config);

// GET /api/establishments - List all establishments (system admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const establishmentService = new EstablishmentService(logger);
    const result = await establishmentService.getAllEstablishments();
    res.json(result);
  } catch (error) {
    logger.error(
      'Error fetching establishments',
      { error: error as Error, user_id: req.user?.id },
      'ESTABLISHMENTS_ROUTE'
    );
    res.status(500).json({ error: 'Failed to fetch establishments' });
  }
});

// GET /api/establishments/stats - Establishment creation statistics
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::text                                                          AS total_establishments,
        COUNT(*) FILTER (WHERE status = 'pending_setup')::text                  AS pending_setup,
        COUNT(*) FILTER (WHERE status = 'active')::text                         AS active,
        COUNT(*) FILTER (WHERE status = 'suspended')::text                      AS suspended,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::text   AS this_month
      FROM establishments
    `);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error(
      'Error fetching establishment creation stats',
      { error: error as Error, user_id: req.user?.id },
      'ESTABLISHMENTS_ROUTE'
    );

    res.status(500).json({
      success: false,
      error: 'Failed to fetch establishment statistics'
    });
  }
});

// GET /api/establishments/health - Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Establishment service is healthy',
    timestamp: new Date().toISOString(),
    service: 'Establishment Service',
    version: '1.0.0'
  });
});

// GET /api/establishments/:id - Get establishment details (system admin only)
router.get('/:id', requireAuth, requireAdmin, validateParams([paramValidations.id]), async (req, res) => {
  try {
    const { id } = req.params;
    const establishmentService = new EstablishmentService(logger);
    const result = await establishmentService.getEstablishmentById(id);
    res.json(result);
  } catch (error) {
    logger.error(
      'Error fetching establishment',
      { error: error as Error, establishmentId: req.params.id },
      'ESTABLISHMENTS_ROUTE'
    );
    if (error instanceof Error && error.message === 'Establishment not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch establishment' });
    }
  }
});

// DELETE /api/establishments/:id - Delete establishment (system admin only)
router.delete('/:id', requireAuth, requireAdmin, validateParams([paramValidations.id]), async (req, res) => {
  try {
    const { id } = req.params;
    const establishmentService = new EstablishmentService(logger);
    await establishmentService.deleteEstablishment(id);
    res.json({ success: true, message: 'Establishment deleted successfully' });
  } catch (error) {
    logger.error(
      'Error deleting establishment',
      { error: error as Error, establishmentId: req.params.id },
      'ESTABLISHMENTS_ROUTE'
    );
    if (error instanceof Error && error.message === 'Establishment not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete establishment' });
    }
  }
});

// POST /api/establishments - Create new establishment (enhanced workflow)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    logger.info('Enhanced establishment creation request received', {
      user_id: req.user?.id,
      user_id_type: typeof req.user?.id,
      body_keys: Object.keys(req.body)
    }, 'ENHANCED_ESTABLISHMENTS_ROUTE');

    const establishmentCreationService = new EstablishmentCreationOrchestrator(logger);
    const result = await establishmentCreationService.createEstablishment(
      req.body,
      String(req.user!.id),
      req.ip,
      req.headers['user-agent']
    );

    res.status(201).json(result);
  } catch (error) {
    logger.error(
      'Error creating enhanced establishment',
      { 
        error: error as Error,
        user_id: req.user?.id,
        request_body: req.body
      },
      'ENHANCED_ESTABLISHMENTS_ROUTE'
    );

    res.status(400).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create establishment',
      details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    });
  }
});

export default router;
