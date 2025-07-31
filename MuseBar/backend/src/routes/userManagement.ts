/**
 * User Management Routes
 * Handles user invitations, password resets, and account setup for multi-tenant system
 */

import express from 'express';
import { UserInvitationService } from '../services/userInvitationService';
import { EmailService } from '../services/emailService';
import { initializeLogger } from '../utils/logger';
import { DatabaseManager } from '../config/database';
import { initializeEnvironment } from '../config/environment';
import { requireAuth, requireAdmin } from './auth';
import { 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError,
  NotFoundError 
} from '../middleware/errorHandler';

const router = express.Router();

// Initialize services
const config = initializeEnvironment();
const logger = initializeLogger(config);
const database = DatabaseManager.getInstance(config, logger);
const emailService = EmailService.getInstance(config, logger);
const invitationService = UserInvitationService.getInstance(emailService, logger, database);

/**
 * Send user invitation (Admin only)
 * POST /api/user-management/invite
 */
router.post('/invite', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const {
      email,
      role = 'cashier',
      firstName,
      lastName,
      establishmentName = 'MuseBar' // Default for current setup
    } = req.body;

    // Validate required fields
    if (!email) {
      throw new ValidationError('Email is required');
    }

    if (!email.includes('@') || !email.includes('.')) {
      throw new ValidationError('Invalid email format');
    }

    const user = (req as any).user;
    const inviterName = user.email; // For now, use email as name

    // Validate role
    const validRoles = ['cashier', 'manager', 'supervisor', 'establishment_admin'];
    if (!validRoles.includes(role)) {
      throw new ValidationError(`Invalid role. Valid roles are: ${validRoles.join(', ')}`);
    }

    // Check if user already exists
    const existingUsers = await database.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (existingUsers.length > 0) {
      throw new ValidationError('A user with this email already exists');
    }

    // Send invitation
    const invitationToken = await invitationService.sendInvitation(
      email,
      user.id,
      inviterName,
      establishmentName,
      role,
      firstName,
      lastName
    );

    logger.info(
      'User invitation sent by admin',
      {
        inviterUserId: user.id,
        inviteeEmail: email,
        role,
        establishmentName,
      },
      'USER_MANAGEMENT',
      (req as any).requestId,
      user.id
    );

    res.status(200).json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        email,
        role,
        establishmentName,
        expiresIn: '7 days',
      },
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Get pending invitations (Admin only)
 * GET /api/user-management/invitations
 */
router.get('/invitations', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const pendingInvitations = invitationService.getPendingInvitations();
    const stats = invitationService.getInvitationStats();

    res.status(200).json({
      success: true,
      data: {
        invitations: pendingInvitations.map(inv => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          firstName: inv.firstName,
          lastName: inv.lastName,
          inviterName: inv.inviterName,
          establishmentName: inv.establishmentName,
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt,
          status: inv.status,
        })),
        statistics: stats,
      },
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Cancel invitation (Admin only)
 * DELETE /api/user-management/invitations/:token
 */
router.delete('/invitations/:token', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { token } = req.params;
    const user = (req as any).user;

    const cancelled = await invitationService.cancelInvitation(token, user.id);

    if (!cancelled) {
      throw new NotFoundError('Invitation not found or already processed');
    }

    logger.info(
      'Invitation cancelled by admin',
      { token, cancellerId: user.id },
      'USER_MANAGEMENT',
      (req as any).requestId,
      user.id
    );

    res.status(200).json({
      success: true,
      message: 'Invitation cancelled successfully',
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Validate invitation token (Public)
 * GET /api/user-management/validate-invitation/:token
 */
router.get('/validate-invitation/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const invitation = await invitationService.validateInvitation(token);

    if (!invitation) {
      throw new NotFoundError('Invitation token is invalid or has expired');
    }

    res.status(200).json({
      success: true,
      data: {
        email: invitation.email,
        establishmentName: invitation.establishmentName,
        role: invitation.role,
        inviterName: invitation.inviterName,
        expiresAt: invitation.expiresAt,
        prefill: {
          firstName: invitation.firstName,
          lastName: invitation.lastName,
        },
      },
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Accept invitation and create account (Public)
 * POST /api/user-management/accept-invitation
 */
router.post('/accept-invitation', async (req, res, next) => {
  try {
    const {
      token,
      firstName,
      lastName,
      password,
      confirmPassword,
    } = req.body;

    // Validate required fields
    if (!token || !firstName || !lastName || !password || !confirmPassword) {
      throw new ValidationError('All fields are required');
    }

    // Accept invitation
    const result = await invitationService.acceptInvitation(token, {
      firstName,
      lastName,
      password,
      confirmPassword,
    });

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    logger.info(
      'Invitation accepted and account created',
      { userId: result.userId, token },
      'USER_MANAGEMENT',
      (req as any).requestId,
      result.userId
    );

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        userId: result.userId,
        loginUrl: '/login',
      },
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Request password reset (Public)
 * POST /api/user-management/request-password-reset
 */
router.post('/request-password-reset', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError('Email is required');
    }

    if (!email.includes('@') || !email.includes('.')) {
      throw new ValidationError('Invalid email format');
    }

    // Send password reset email (always returns true for security)
    await invitationService.sendPasswordResetEmail(email);

    logger.info(
      'Password reset requested',
      { email },
      'USER_MANAGEMENT',
      (req as any).requestId
    );

    // Always return success to avoid email enumeration
    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Reset password with token (Public)
 * POST /api/user-management/reset-password
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    const {
      token,
      newPassword,
      confirmPassword,
    } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      throw new ValidationError('All fields are required');
    }

    const result = await invitationService.resetPassword(token, newPassword, confirmPassword);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    logger.info(
      'Password reset completed',
      { token },
      'USER_MANAGEMENT',
      (req as any).requestId
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        loginUrl: '/login',
      },
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Get user management statistics (Admin only)
 * GET /api/user-management/stats
 */
router.get('/stats', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const invitationStats = invitationService.getInvitationStats();
    const emailStats = emailService.getEmailStats();

    // Get user statistics from database
    const userStats = await database.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN last_login > NOW() - INTERVAL '30 days' THEN 1 END) as recent_logins
      FROM users
    `);

    const roleStats = await database.query(`
      SELECT 
        role,
        COUNT(*) as count
      FROM users 
      WHERE is_active = true
      GROUP BY role
      ORDER BY count DESC
    `);

    res.status(200).json({
      success: true,
      data: {
        users: userStats[0] || {
          total_users: 0,
          active_users: 0,
          verified_users: 0,
          recent_logins: 0,
        },
        roles: roleStats,
        invitations: invitationStats,
        email: emailStats,
      },
    });

  } catch (error) {
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
      throw new ValidationError('Test email address is required');
    }

    const testResult = await emailService.testConfiguration(testEmail);

    logger.info(
      'Email configuration tested',
      { testEmail, testResult, testerUserId: user.id },
      'USER_MANAGEMENT',
      (req as any).requestId,
      user.id
    );

    res.status(200).json({
      success: true,
      message: testResult 
        ? 'Test email sent successfully' 
        : 'Email test failed - check configuration',
      data: {
        testResult,
        configuration: emailService.validateConfiguration(),
      },
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Get email templates (Admin only)
 * GET /api/user-management/email-templates
 */
router.get('/email-templates', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const templates = emailService.getAvailableTemplates();

    res.status(200).json({
      success: true,
      data: {
        templates: templates.map(template => ({
          id: template.id,
          name: template.name,
          subject: template.subject,
          variables: template.variables,
        })),
      },
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Cleanup expired tokens (Admin only)
 * POST /api/user-management/cleanup
 */
router.post('/cleanup', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const user = (req as any).user;

    invitationService.cleanupExpired();

    logger.info(
      'Manual token cleanup performed',
      { performedBy: user.id },
      'USER_MANAGEMENT',
      (req as any).requestId,
      user.id
    );

    res.status(200).json({
      success: true,
      message: 'Expired tokens cleaned up successfully',
      data: {
        statistics: invitationService.getInvitationStats(),
      },
    });

  } catch (error) {
    next(error);
  }
});

export default router; 