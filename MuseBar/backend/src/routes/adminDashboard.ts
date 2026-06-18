/**
 * Admin Dashboard Routes
 * Provides enhanced dashboard functionality for system administrators
 */

import express from 'express';
import { requireAuth, requireAdmin } from './auth';
import { DashboardDataService } from '../services/establishment';
import { Logger } from '../utils/logger';
import { getEnvironmentConfig } from '../config/environment';
import { pool } from '../db/pool';
import { AppError, asyncHandler } from '../middleware/errorHandler';

const router = express.Router();
const config = getEnvironmentConfig();
const logger = Logger.getInstance(config);
const dashboardService = new DashboardDataService(logger);

// GET /api/admin-dashboard/test - Minimal test endpoint; requires auth and admin like other dashboard routes
router.get('/test', requireAuth, requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// GET /api/admin-dashboard/metrics - Get comprehensive dashboard metrics
router.get('/metrics', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      const metrics = await dashboardService.getDashboardMetrics(client);
      
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error(
      'Error fetching dashboard metrics',
      { 
        error: error as Error,
        user_id: req.user?.id
      },
      'ADMIN_DASHBOARD_ROUTE'
    );
    throw new AppError('Failed to fetch dashboard metrics', 500, 'ADMIN_DASHBOARD_METRICS_FAILED');
  }
}));

// GET /api/admin-dashboard/health - Health check for admin dashboard service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Admin dashboard service is healthy',
    timestamp: new Date().toISOString(),
    service: 'Admin Dashboard Service',
    version: '1.0.0',
    features: [
      'Comprehensive establishment metrics',
      'Setup progress tracking',
      'Recent activity monitoring',
      'Performance analytics',
      'Real-time dashboard data'
    ]
  });
});

export default router;
