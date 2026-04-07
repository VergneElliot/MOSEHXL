/**
 * Establishment Search Routes
 * Provides search, filtering, and pagination for establishments
 */

import express from 'express';
import { requireAuth, requireAdmin } from './auth';
import { EstablishmentSearchService } from '../services/establishment';
import { Logger } from '../utils/logger';
import { getEnvironmentConfig } from '../config/environment';
import type { EstablishmentStatus } from '../services/establishment/types';

const router = express.Router();
const config = getEnvironmentConfig();
const logger = Logger.getInstance(config);

// GET /api/establishment-search - Search establishments with filters and pagination
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const searchService = new EstablishmentSearchService(logger);
    
    // Parse query parameters
    const filters = {
      name: req.query.name as string,
      email: req.query.email as string,
      status: req.query.status as EstablishmentStatus,
      business_type: req.query.business_type as string,
      subscription_plan: req.query.subscription_plan as string,
      created_after: req.query.created_after ? new Date(req.query.created_after as string) : undefined,
      created_before: req.query.created_before ? new Date(req.query.created_before as string) : undefined,
      setup_progress_min: req.query.setup_progress_min ? parseInt(req.query.setup_progress_min as string) : undefined,
      setup_progress_max: req.query.setup_progress_max ? parseInt(req.query.setup_progress_max as string) : undefined
    };

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(parseInt(req.query.limit as string) || 20, 100), // Max 100 per page
      sortBy: (req.query.sortBy as 'name' | 'created_at' | 'status' | 'setup_progress') || 'created_at',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
    };

    // Validate options
    if (options.page < 1) options.page = 1;
    if (!['name', 'created_at', 'status', 'setup_progress'].includes(options.sortBy)) {
      options.sortBy = 'created_at';
    }
    if (!['asc', 'desc'].includes(options.sortOrder)) {
      options.sortOrder = 'desc';
    }

    // Get database client
    const { pool } = await import('../app');
    const client = await pool.connect();
    
    try {
      const results = await searchService.searchEstablishments(client, filters, options);
      
      res.json({
        success: true,
        data: results,
        filters,
        options
      });
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error(
      'Error searching establishments',
      { 
        error: error as Error,
        user_id: req.user?.id,
        query: req.query
      },
      'ESTABLISHMENT_SEARCH_ROUTE'
    );

    res.status(500).json({ 
      success: false,
      error: 'Failed to search establishments'
    });
  }
});

// GET /api/establishment-search/suggestions - Get search suggestions for autocomplete
router.get('/suggestions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const searchService = new EstablishmentSearchService(logger);
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        data: [],
        message: 'Query must be at least 2 characters long'
      });
    }

    // Get database client
    const { pool } = await import('../app');
    const client = await pool.connect();
    
    try {
      const suggestions = await searchService.getSearchSuggestions(client, query.trim(), limit);
      
      res.json({
        success: true,
        data: suggestions,
        query: query.trim(),
        limit
      });
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error(
      'Error getting search suggestions',
      { 
        error: error as Error,
        user_id: req.user?.id,
        query: req.query
      },
      'ESTABLISHMENT_SEARCH_ROUTE'
    );

    res.status(500).json({ 
      success: false,
      error: 'Failed to get search suggestions'
    });
  }
});

// GET /api/establishment-search/health - Health check for search service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Establishment search service is healthy',
    timestamp: new Date().toISOString(),
    service: 'Establishment Search Service',
    version: '1.0.0',
    features: [
      'Advanced search and filtering',
      'Pagination and sorting',
      'Setup progress filtering',
      'Date range filtering',
      'Autocomplete suggestions'
    ]
  });
});

export default router;
