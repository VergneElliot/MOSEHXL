/**
 * Enhanced Establishments Routes
 * Provides enhanced establishment creation and management for system admins
 */

import express from 'express';
import { requireAuth, requireAdmin } from './auth';
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
    const establishmentCreationService = new EstablishmentCreationOrchestrator(logger);
    const stats = await establishmentCreationService.getCreationStats();
    
    res.json({
      success: true,
      data: stats
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
