/**
 * Enhanced User Management Routes
 * Handles user invitations, establishment management, and multi-tenant user operations
 */

import express from 'express';
import { requireAuth, requireAdmin } from './auth';
import { validateBody, validateParams } from '../middleware/validation';
import { UserInvitationService } from '../services/userInvitationService';
import { EstablishmentModel } from '../models/establishment';
import { AuditTrailModel } from '../models/auditTrail';
import { pool } from '../app';
import { Logger } from '../utils/logger';
import { EnvironmentConfig } from '../config/environment';

const router = express.Router();

/**
 * Initialize services
 */
let userInvitationService: UserInvitationService;
let logger: Logger;

export function initializeUserManagementRoutes(config: EnvironmentConfig, log: Logger): void {
  logger = log;
  userInvitationService = UserInvitationService.getInstance(config, log);
}

/**
 * POST /api/user-management/send-establishment-invitation
 * Send establishment invitation (System Admin only)
 */
router.post('/send-establishment-invitation', requireAuth, requireAdmin, validateBody([
  { field: 'name', required: true },
  { field: 'email', required: true },
]), async (req, res, next) => {
  try {
    const { name, email, phone, address, subscription_plan } = req.body;
    const user = (req as any).user;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Establishment name and email are required'
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
      { invitationData: req.body, userId: (req as any).user.id },
      'USER_MANAGEMENT_ROUTES'
    );
    next(error);
  }
});

/**
 * POST /api/user-management/send-user-invitation
 * Send user invitation (Establishment Admin only)
 */
router.post('/send-user-invitation', requireAuth, validateBody([
  { field: 'email', required: true },
  { field: 'firstName', required: true },
  { field: 'lastName', required: true },
  { field: 'role', required: true },
  { field: 'establishmentId', required: true },
]), async (req, res, next) => {
  try {
    const { email, firstName, lastName, role, establishmentId } = req.body;
    const user = (req as any).user;

    // Validate required fields
    if (!email || !firstName || !lastName || !role || !establishmentId) {
      return res.status(400).json({
        success: false,
        message: 'Email, first name, last name, role, and establishment ID are required'
      });
    }

    // Validate user has access to this establishment
    if (!user.is_admin && user.establishment_id !== establishmentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this establishment'
      });
    }

    // Get establishment details
    const establishment = await EstablishmentModel.getById(establishmentId);
    if (!establishment) {
      return res.status(404).json({
        success: false,
        message: 'Establishment not found'
      });
    }

    // Check if user already exists in this establishment
    const existingUser = await pool.query(`
      SELECT id FROM users 
      WHERE email = $1 AND establishment_id = $2
    `, [email, establishmentId]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User already exists in this establishment'
      });
    }

    // Send user invitation
    const result = await userInvitationService.sendUserInvitation({
      email,
      firstName,
      lastName,
      role,
      establishmentId,
      establishmentName: establishment.name,
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
      action_type: 'SEND_USER_INVITATION',
      action_details: {
        userEmail: email,
        userRole: role,
        establishmentId,
        establishmentName: establishment.name,
        invitationId: result.invitationId,
        emailTrackingId: result.trackingId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'User invitation sent successfully',
      data: {
        invitationId: result.invitationId,
        emailTrackingId: result.trackingId,
        userEmail: email
      }
    });
  } catch (error) {
    logger?.error(
      'Failed to send user invitation',
      error as Error,
      { invitationData: req.body, userId: (req as any).user.id },
      'USER_MANAGEMENT_ROUTES'
    );
    next(error);
  }
});

/**
 * POST /api/user-management/accept-invitation
 * Accept user invitation
 */
router.post('/accept-invitation', validateBody([
  { field: 'token', required: true },
  { field: 'password', required: true },
]), async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required'
      });
    }

    // Get invitation details
    const invitation = await userInvitationService.getInvitationByToken(token);
    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invitation token'
      });
    }

    // Accept invitation based on type
    let result;
    if (invitation.role === 'establishment_admin') {
      result = await userInvitationService.acceptEstablishmentInvitation(token, password);
    } else {
      result = await userInvitationService.acceptUserInvitation(token, password);
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    await AuditTrailModel.logAction({
      action_type: 'ACCEPT_INVITATION',
      action_details: {
        invitationId: invitation.id,
        userEmail: invitation.email,
        role: invitation.role,
        establishmentName: invitation.establishment_name
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: result.message,
      data: {
        establishmentId: result.establishmentId,
        userEmail: invitation.email
      }
    });
  } catch (error) {
    logger?.error(
      'Failed to accept invitation',
      error as Error,
      { token: req.body.token },
      'USER_MANAGEMENT_ROUTES'
    );
    next(error);
  }
});

/**
 * GET /api/user-management/pending-invitations
 * Get pending invitations for establishment (Establishment Admin only)
 */
router.get('/pending-invitations', requireAuth, async (req, res, next) => {
  try {
    const user = (req as any).user;
    const establishmentId = user.establishment_id;

    if (!establishmentId) {
      return res.status(400).json({
        success: false,
        message: 'User must be associated with an establishment'
      });
    }

    const invitations = await userInvitationService.getPendingInvitations(establishmentId);

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'VIEW_PENDING_INVITATIONS',
      action_details: {
        establishmentId,
        invitationCount: invitations.length
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: invitations,
      count: invitations.length
    });
  } catch (error) {
    logger?.error(
      'Failed to get pending invitations',
      error as Error,
      { userId: (req as any).user.id },
      'USER_MANAGEMENT_ROUTES'
    );
    next(error);
  }
});

/**
 * DELETE /api/user-management/cancel-invitation/:invitationId
 * Cancel invitation (Establishment Admin only)
 */
router.delete('/cancel-invitation/:invitationId', requireAuth, validateParams([{ param: 'invitationId', validator: (v:any)=> typeof v === 'string' && v.length > 0 }]), async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const user = (req as any).user;

    const success = await userInvitationService.cancelInvitation(invitationId, String(user.id));

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found or already processed'
      });
    }

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'CANCEL_INVITATION',
      action_details: {
        invitationId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });
  } catch (error) {
    logger?.error(
      'Failed to cancel invitation',
      error as Error,
      { invitationId: req.params.invitationId, userId: (req as any).user.id },
      'USER_MANAGEMENT_ROUTES'
    );
    next(error);
  }
});

/**
 * GET /api/user-management/establishment-users
 * Get users for current establishment (Establishment Admin only)
 */
router.get('/establishment-users', requireAuth, async (req, res, next) => {
  try {
    const user = (req as any).user;
    const establishmentId = user.establishment_id;

    if (!establishmentId) {
      return res.status(400).json({
        success: false,
        message: 'User must be associated with an establishment'
      });
    }

    const result = await pool.query(`
      SELECT id, email, first_name, last_name, role, is_admin, is_active, 
             email_verified, last_login, created_at
      FROM users 
      WHERE establishment_id = $1
      ORDER BY created_at DESC
    `, [establishmentId]);

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'VIEW_ESTABLISHMENT_USERS',
      action_details: {
        establishmentId,
        userCount: result.rows.length
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger?.error(
      'Failed to get establishment users',
      error as Error,
      { userId: (req as any).user.id },
      'USER_MANAGEMENT_ROUTES'
    );
    next(error);
  }
});

/**
 * Test email configuration (Admin only)
 * POST /api/user-management/test-email
 */
router.post('/test-email', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { testEmail } = req.body;
    const user = (req as any).user;

    if (!testEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Test email address is required' 
      });
    }

    // Test email service configuration
    const emailService = userInvitationService['emailService'];
    const testResult = await emailService.testConfiguration(testEmail);

    if (testResult) {
      await AuditTrailModel.logAction({
        user_id: String(user.id),
        action_type: 'TEST_EMAIL_CONFIGURATION',
        action_details: { testEmail, result: 'success' },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(200).json({
        success: true,
        message: 'Email test sent successfully',
        data: {
          testEmail,
          testerUserId: user.id,
          note: 'Check your email for the test message'
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Email test failed. Check your SendGrid configuration.',
        data: {
          testEmail,
          testerUserId: user.id,
          note: 'Verify SENDGRID_API_KEY and FROM_EMAIL environment variables'
        },
      });
    }

  } catch (error) {
    logger?.error(
      'Email test failed',
      error as Error,
      { testEmail: req.body.testEmail, userId: (req as any).user.id },
      'USER_MANAGEMENT_ROUTES'
    );
    next(error);
  }
});

/**
 * Get user management statistics (Admin only)
 * GET /api/user-management/stats
 */
router.get('/stats', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const user = (req as any).user;

    // Get email service stats
    const emailService = userInvitationService['emailService'];
    const emailStats = emailService.getEmailStats();
    const emailConfig = emailService.validateConfiguration();

    // Get invitation stats
    const pendingInvitationsResult = await pool.query(`
      SELECT COUNT(*) as pending_count FROM user_invitations WHERE status = 'pending'
    `);
    const pendingCount = parseInt(pendingInvitationsResult.rows[0].pending_count) || 0;

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'VIEW_USER_MANAGEMENT_STATS',
      action_details: { emailStats, pendingInvitations: pendingCount },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'User management system is operational',
      data: {
        status: 'operational',
        emailService: {
          configured: emailConfig.isValid,
          issues: emailConfig.issues,
          stats: emailStats
        },
        invitations: {
          pending: pendingCount
        },
        features: {
          establishmentInvitations: 'enabled',
          userInvitations: 'enabled',
          emailTemplates: 'enabled',
          multiTenant: 'enabled'
        }
      },
    });

  } catch (error) {
    logger?.error(
      'Failed to get user management stats',
      error as Error,
      { userId: (req as any).user.id },
      'USER_MANAGEMENT_ROUTES'
    );
    next(error);
  }
});

/**
 * Health check for user management
 * GET /api/user-management/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User management routes are active',
    timestamp: new Date().toISOString(),
    features: {
      establishmentInvitations: 'enabled',
      userInvitations: 'enabled',
      emailService: 'enabled',
      multiTenant: 'enabled'
    }
  });
});

export default router; 