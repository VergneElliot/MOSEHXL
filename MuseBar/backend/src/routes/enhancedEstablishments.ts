/**
 * Enhanced Establishments Routes
 * Provides enhanced establishment creation and management for system admins
 */

import express from 'express';
import { requireAuth, requireAdmin } from './auth';
import { pool } from '../app';
import { EstablishmentCreationOrchestrator } from '../services/establishment';
import { validateParams, validateBody, paramValidations } from '../middleware/validation';
import { Logger } from '../utils/logger';
import { getEnvironmentConfig } from '../config/environment';

const router = express.Router();
const config = getEnvironmentConfig();
const logger = Logger.getInstance(config);

// POST /api/enhanced-establishments - Create new establishment with enhanced workflow
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

// GET /api/enhanced-establishments/stats - Get establishment creation statistics
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
      { 
        error: error as Error,
        user_id: req.user?.id
      },
      'ENHANCED_ESTABLISHMENTS_ROUTE'
    );

    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch establishment statistics'
    });
  }
});

// GET /api/enhanced-establishments/health - Health check for enhanced establishment service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Enhanced establishment service is healthy',
    timestamp: new Date().toISOString(),
    service: 'Enhanced Establishment Creation Service',
    version: '1.0.0',
    features: [
      'Enhanced establishment creation workflow',
      'Business type and timezone support',
      'Automated schema creation',
      'Email confirmation system',
      'Audit trail logging',
      'Statistics and reporting'
    ]
  });
});

export default router;
