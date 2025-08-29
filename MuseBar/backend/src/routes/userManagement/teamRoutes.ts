/**
 * Team Routes - Team Management Operations
 * Handles team statistics, member management, and team operations
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../auth';
import { pool } from '../../app';
import { AuditTrailModel } from '../../models/auditTrail';
import { UserInvitationService } from '../../services/userInvitationService';
import { Logger } from '../../utils/logger';
import {
  AuthenticatedRequest,
  TeamStats,
  TeamMember,
  EmailTestResult,
  ServiceInitialization
} from './types';

const router = express.Router();

// Service instances
let userInvitationService: UserInvitationService;
let logger: Logger;

/**
 * Initialize team routes
 */
export function initializeTeamRoutes(services: ServiceInitialization): void {
  userInvitationService = services.userInvitationService;
  logger = services.logger;
}

/**
 * GET /team-stats
 * Get team statistics for establishment
 */
router.get('/team-stats', requireAuth, async (req: any, res: any, next: any) => {
  try {
    const user = req.user!;
    const establishmentId = req.query.establishmentId as string || user.establishment_id;

    if (!establishmentId) {
      return res.status(400).json({
        success: false,
        message: 'User must be associated with an establishment'
      });
    }

    // Validate access
    if (!user.is_admin && user.establishment_id !== establishmentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this establishment'
      });
    }

    // Get total members
    const totalMembersResult = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE establishment_id = $1',
      [establishmentId]
    );

    // Get active members
    const activeMembersResult = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE establishment_id = $1 AND is_active = true',
      [establishmentId]
    );

    // Get pending invitations
    const pendingInvitations = await userInvitationService.getPendingInvitations(establishmentId);

    // Get role distribution
    const roleDistributionResult = await pool.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      WHERE establishment_id = $1 AND is_active = true
      GROUP BY role
    `, [establishmentId]);

    const roleDistribution: Record<string, number> = {};
    roleDistributionResult.rows.forEach(row => {
      roleDistribution[row.role] = parseInt(row.count);
    });

    const stats: TeamStats = {
      totalMembers: parseInt(totalMembersResult.rows[0].count),
      activeMembers: parseInt(activeMembersResult.rows[0].count),
      pendingInvitations: pendingInvitations.length,
      roleDistribution
    };

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'VIEW_TEAM_STATS',
      action_details: {
        establishmentId,
        stats
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger?.error(
      'Failed to get team statistics',
      error as Error,
      { userId: req.user?.id },
      'TEAM_ROUTES'
    );
    next(error);
  }
});

/**
 * GET /team-members
 * Get team members with detailed information
 */
router.get('/team-members', requireAuth, async (req: any, res: any, next: any) => {
  try {
    const user = req.user!;
    const establishmentId = req.query.establishmentId as string || user.establishment_id;
    const includeInactive = req.query.includeInactive === 'true';

    if (!establishmentId) {
      return res.status(400).json({
        success: false,
        message: 'User must be associated with an establishment'
      });
    }

    // Validate access
    if (!user.is_admin && user.establishment_id !== establishmentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this establishment'
      });
    }

    let query = `
      SELECT 
        u.id,
        u.email,
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.role,
        u.is_active as "status",
        u.last_login_at as "lastLogin",
        u.created_at as "createdAt"
      FROM users u
      WHERE u.establishment_id = $1
    `;

    const queryParams = [establishmentId];

    if (!includeInactive) {
      query += ' AND u.is_active = true';
    }

    query += ' ORDER BY u.created_at DESC';

    const result = await pool.query(query, queryParams);

    // Transform status for better readability
    const teamMembers: TeamMember[] = result.rows.map(row => ({
      ...row,
      status: row.status ? 'active' : 'inactive',
      permissions: {
        canManageUsers: ['admin', 'manager'].includes(row.role),
        canManageEstablishment: ['admin'].includes(row.role),
        canViewReports: ['admin', 'manager'].includes(row.role),
        canManageInventory: ['admin', 'manager', 'staff'].includes(row.role),
        canProcessOrders: ['admin', 'manager', 'staff', 'cashier'].includes(row.role),
        canManageSettings: ['admin'].includes(row.role)
      }
    }));

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'VIEW_TEAM_MEMBERS',
      action_details: {
        establishmentId,
        memberCount: teamMembers.length,
        includeInactive
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: teamMembers,
      count: teamMembers.length
    });
  } catch (error) {
    logger?.error(
      'Failed to get team members',
      error as Error,
      { userId: req.user?.id },
      'TEAM_ROUTES'
    );
    next(error);
  }
});

/**
 * POST /test-email
 * Test email configuration (Admin only)
 */
router.post('/test-email', requireAuth, requireAdmin, async (req: any, res: any, next: any) => {
  try {
    const { testEmail } = req.body;
    const user = req.user!;

    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: 'Test email address is required'
      });
    }

    // Test email service configuration
    const emailService = (userInvitationService as any)['emailService'];
    const testResult = await emailService.testConfiguration();

    if (testResult) {
      await AuditTrailModel.logAction({
        user_id: String(user.id),
        action_type: 'TEST_EMAIL_CONFIGURATION',
        action_details: {
          testEmail,
          result: 'success'
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      const emailTestResult: EmailTestResult = {
        success: true,
        message: 'Email configuration test successful',
        details: {
          provider: 'SendGrid', // Assuming SendGrid
          configuration: 'Valid',
          testTimestamp: new Date()
        }
      };

      res.json({
        success: true,
        message: 'Email service is configured correctly',
        data: emailTestResult
      });
    } else {
      await AuditTrailModel.logAction({
        user_id: String(user.id),
        action_type: 'TEST_EMAIL_CONFIGURATION',
        action_details: {
          testEmail,
          result: 'failure'
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(500).json({
        success: false,
        message: 'Email service configuration test failed',
        data: {
          success: false,
          message: 'Email service configuration is invalid or incomplete'
        }
      });
    }
  } catch (error) {
    logger?.error(
      'Failed to test email configuration',
      error as Error,
      { testEmail: req.body.testEmail, userId: req.user?.id },
      'TEAM_ROUTES'
    );
    
    res.status(500).json({
      success: false,
      message: 'Email configuration test failed',
      data: {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    });
  }
});

/**
 * GET /email-stats
 * Get email service statistics (Admin only)
 */
router.get('/email-stats', requireAuth, requireAdmin, async (req: any, res: any, next: any) => {
  try {
    const user = req.user!;

    // Get email service statistics
    const emailService = (userInvitationService as any)['emailService'];
    const stats = await emailService.getEmailStats();

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'VIEW_EMAIL_STATS',
      action_details: {
        statsRequested: true
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: stats || {
        totalSent: 0,
        totalFailed: 0,
        lastSent: null,
        provider: 'Not configured'
      }
    });
  } catch (error) {
    logger?.error(
      'Failed to get email statistics',
      error as Error,
      { userId: req.user?.id },
      'TEAM_ROUTES'
    );
    next(error);
  }
});

/**
 * POST /bulk-invite
 * Send bulk invitations (Admin only)
 */
router.post('/bulk-invite', requireAuth, requireAdmin, async (req: any, res: any, next: any) => {
  try {
    const { invitations, establishmentId } = req.body;
    const user = req.user!;

    if (!Array.isArray(invitations) || invitations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invitations array is required'
      });
    }

    if (!establishmentId) {
      return res.status(400).json({
        success: false,
        message: 'Establishment ID is required'
      });
    }

    // Validate access
    if (!user.is_admin && user.establishment_id !== establishmentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this establishment'
      });
    }

    const results = [];
    const errors = [];

    for (const invitation of invitations) {
      try {
        const result = await userInvitationService.sendUserInvitation({
          ...invitation,
          establishmentId,
          invitedBy: String(user.id)
        });
        results.push({
          email: invitation.email,
          success: true,
          invitationId: result.invitationId
        });
      } catch (error) {
        errors.push({
          email: invitation.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'BULK_INVITE_USERS',
      action_details: {
        establishmentId,
        totalInvitations: invitations.length,
        successful: results.length,
        failed: errors.length
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: errors.length === 0,
      message: `Sent ${results.length} invitations successfully. ${errors.length} failed.`,
      data: {
        successful: results,
        failed: errors,
        summary: {
          total: invitations.length,
          successful: results.length,
          failed: errors.length
        }
      }
    });
  } catch (error) {
    logger?.error(
      'Failed to send bulk invitations',
      error as Error,
      { userId: req.user?.id },
      'TEAM_ROUTES'
    );
    next(error);
  }
});

export { router as teamRoutes };

