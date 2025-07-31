/**
 * Establishment Management Routes
 * System administrator endpoints for managing establishments
 */

import express from 'express';
import { requireAuth, requireAdmin } from './auth';
import { EstablishmentModel, CreateEstablishmentData, UpdateEstablishmentData } from '../models/establishment';
import { UserInvitationService } from '../services/userInvitationService';
import { AuditTrailModel } from '../models/auditTrail';
import { Logger } from '../utils/logger';
import { EnvironmentConfig } from '../config/environment';
import { pool } from '../app';

const router = express.Router();

/**
 * Initialize services
 */
let userInvitationService: UserInvitationService;
let logger: Logger;

export function initializeEstablishmentRoutes(config: EnvironmentConfig, log: Logger): void {
  logger = log;
  userInvitationService = UserInvitationService.getInstance(config, log);
  EstablishmentModel.initialize(log);
}

/**
 * GET /api/establishments
 * Get all establishments (System Admin only)
 */
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const establishments = await EstablishmentModel.getAllEstablishments();
    
    await AuditTrailModel.logAction({
      user_id: String((req as any).user.id),
      action_type: 'LIST_ESTABLISHMENTS',
      action_details: { count: establishments.length },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: establishments,
      count: establishments.length
    });
  } catch (error) {
    logger?.error(
      'Failed to get establishments',
      error as Error,
      { userId: (req as any).user.id },
      'ESTABLISHMENT_ROUTES'
    );
    next(error);
  }
});

/**
 * GET /api/establishments/:id
 * Get establishment by ID (System Admin only)
 */
router.get('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const establishment = await EstablishmentModel.getById(id);
    
    if (!establishment) {
      return res.status(404).json({
        success: false,
        message: 'Establishment not found'
      });
    }

    // Get establishment statistics
    const stats = await EstablishmentModel.getEstablishmentStats(id);

    await AuditTrailModel.logAction({
      user_id: String((req as any).user.id),
      action_type: 'VIEW_ESTABLISHMENT',
      resource_type: 'ESTABLISHMENT',
      resource_id: id,
      action_details: { establishmentName: establishment.name },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: {
        ...establishment,
        stats
      }
    });
  } catch (error) {
    logger?.error(
      'Failed to get establishment',
      error as Error,
      { establishmentId: req.params.id, userId: (req as any).user.id },
      'ESTABLISHMENT_ROUTES'
    );
    next(error);
  }
});

/**
 * POST /api/establishments
 * Create new establishment (System Admin only)
 */
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const establishmentData: CreateEstablishmentData = req.body;
    const user = (req as any).user;

    // Validate establishment data
    const validation = EstablishmentModel.validateEstablishmentData(establishmentData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid establishment data',
        errors: validation.errors
      });
    }

    // Check if establishment already exists
    const existingEstablishment = await EstablishmentModel.getByEmail(establishmentData.email);
    if (existingEstablishment) {
      return res.status(409).json({
        success: false,
        message: 'An establishment with this email already exists'
      });
    }

    // Create establishment
    const establishment = await EstablishmentModel.createEstablishment(establishmentData);

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'CREATE_ESTABLISHMENT',
      resource_type: 'ESTABLISHMENT',
      resource_id: establishment.id,
      action_details: {
        establishmentName: establishment.name,
        establishmentEmail: establishment.email,
        subscriptionPlan: establishment.subscription_plan
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(201).json({
      success: true,
      message: 'Establishment created successfully',
      data: establishment
    });
  } catch (error) {
    logger?.error(
      'Failed to create establishment',
      error as Error,
      { establishmentData: req.body, userId: (req as any).user.id },
      'ESTABLISHMENT_ROUTES'
    );
    next(error);
  }
});

/**
 * POST /api/establishments/:id/invite
 * Send establishment invitation (System Admin only)
 */
router.post('/:id/invite', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, name, phone, address, subscription_plan } = req.body;
    const user = (req as any).user;

    // Validate required fields
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email and establishment name are required'
      });
    }

    // Check if establishment already exists
    const existingEstablishment = await EstablishmentModel.getByEmail(email);
    if (existingEstablishment) {
      return res.status(409).json({
        success: false,
        message: 'An establishment with this email already exists'
      });
    }

    // Send establishment invitation
    const result = await userInvitationService.sendEstablishmentInvitation({
      name,
      email,
      phone,
      address,
      subscription_plan,
      inviterUserId: String(user.id),
      inviterName: user.email
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'SEND_ESTABLISHMENT_INVITATION',
      action_details: {
        establishmentName: name,
        establishmentEmail: email,
        invitationId: result.invitationId,
        emailTrackingId: result.trackingId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Establishment invitation sent successfully',
      data: {
        invitationId: result.invitationId,
        emailTrackingId: result.trackingId,
        establishmentEmail: email
      }
    });
  } catch (error) {
    logger?.error(
      'Failed to send establishment invitation',
      error as Error,
      { establishmentId: req.params.id, invitationData: req.body, userId: (req as any).user.id },
      'ESTABLISHMENT_ROUTES'
    );
    next(error);
  }
});

/**
 * PUT /api/establishments/:id
 * Update establishment (System Admin only)
 */
router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData: UpdateEstablishmentData = req.body;
    const user = (req as any).user;

    // Validate establishment exists
    const existingEstablishment = await EstablishmentModel.getById(id);
    if (!existingEstablishment) {
      return res.status(404).json({
        success: false,
        message: 'Establishment not found'
      });
    }

    // Update establishment
    const updatedEstablishment = await EstablishmentModel.updateEstablishment(id, updateData);

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'UPDATE_ESTABLISHMENT',
      resource_type: 'ESTABLISHMENT',
      resource_id: id,
      action_details: {
        establishmentName: updatedEstablishment.name,
        updatedFields: Object.keys(updateData)
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Establishment updated successfully',
      data: updatedEstablishment
    });
  } catch (error) {
    logger?.error(
      'Failed to update establishment',
      error as Error,
      { establishmentId: req.params.id, updateData: req.body, userId: (req as any).user.id },
      'ESTABLISHMENT_ROUTES'
    );
    next(error);
  }
});

/**
 * DELETE /api/establishments/:id
 * Delete establishment (System Admin only)
 */
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Validate establishment exists
    const existingEstablishment = await EstablishmentModel.getById(id);
    if (!existingEstablishment) {
      return res.status(404).json({
        success: false,
        message: 'Establishment not found'
      });
    }

    // Delete establishment
    await EstablishmentModel.deleteEstablishment(id);

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'DELETE_ESTABLISHMENT',
      resource_type: 'ESTABLISHMENT',
      resource_id: id,
      action_details: {
        establishmentName: existingEstablishment.name,
        establishmentEmail: existingEstablishment.email
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Establishment deleted successfully'
    });
  } catch (error) {
    logger?.error(
      'Failed to delete establishment',
      error as Error,
      { establishmentId: req.params.id, userId: (req as any).user.id },
      'ESTABLISHMENT_ROUTES'
    );
    next(error);
  }
});

/**
 * GET /api/establishments/:id/stats
 * Get establishment statistics (System Admin only)
 */
router.get('/:id/stats', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Validate establishment exists
    const establishment = await EstablishmentModel.getById(id);
    if (!establishment) {
      return res.status(404).json({
        success: false,
        message: 'Establishment not found'
      });
    }

    // Get establishment statistics
    const stats = await EstablishmentModel.getEstablishmentStats(id);

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'VIEW_ESTABLISHMENT_STATS',
      resource_type: 'ESTABLISHMENT',
      resource_id: id,
      action_details: { establishmentName: establishment.name },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: {
        establishment,
        stats
      }
    });
  } catch (error) {
    logger?.error(
      'Failed to get establishment stats',
      error as Error,
      { establishmentId: req.params.id, userId: (req as any).user.id },
      'ESTABLISHMENT_ROUTES'
    );
    next(error);
  }
});

/**
 * GET /api/establishments/:id/users
 * Get users for establishment (System Admin only)
 */
router.get('/:id/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Validate establishment exists
    const establishment = await EstablishmentModel.getById(id);
    if (!establishment) {
      return res.status(404).json({
        success: false,
        message: 'Establishment not found'
      });
    }

    // Get users for this establishment
    const result = await pool.query(`
      SELECT id, email, first_name, last_name, role, is_admin, is_active, 
             email_verified, last_login, created_at
      FROM users 
      WHERE establishment_id = $1
      ORDER BY created_at DESC
    `, [id]);

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'VIEW_ESTABLISHMENT_USERS',
      resource_type: 'ESTABLISHMENT',
      resource_id: id,
      action_details: { 
        establishmentName: establishment.name,
        userCount: result.rows.length
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: {
        establishment,
        users: result.rows,
        count: result.rows.length
      }
    });
  } catch (error) {
    logger?.error(
      'Failed to get establishment users',
      error as Error,
      { establishmentId: req.params.id, userId: (req as any).user.id },
      'ESTABLISHMENT_ROUTES'
    );
    next(error);
  }
});

export default router; 