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
import { countUsers, countActiveUsers, getRoleDistribution, fetchTeamMembers } from './team';
import { logViewTeamStats, logViewTeamMembers, logTestEmailConfiguration, logViewEmailStats, logBulkInviteUsers } from './team';

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

    const [totalMembers, activeMembers, pendingInvitations, roleDistribution] = await Promise.all([
      countUsers(establishmentId),
      countActiveUsers(establishmentId),
      userInvitationService.getPendingInvitations(establishmentId),
      getRoleDistribution(establishmentId)
    ]);

    const stats: TeamStats = {
      totalMembers,
      activeMembers,
      pendingInvitations: pendingInvitations.length,
      roleDistribution
    };
    await logViewTeamStats(user.id, establishmentId, stats, req.ip, req.headers['user-agent'] as string | undefined);

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

    const rows = await fetchTeamMembers(establishmentId, includeInactive);
    const teamMembers: TeamMember[] = rows.map((row: any) => ({
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
    await logViewTeamMembers(user.id, establishmentId, teamMembers.length, includeInactive, req.ip, req.headers['user-agent'] as string | undefined);

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
      await logTestEmailConfiguration(user.id, testEmail, 'success', req.ip, req.headers['user-agent'] as string | undefined);

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
      await logTestEmailConfiguration(user.id, testEmail, 'failure', req.ip, req.headers['user-agent'] as string | undefined);

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

    await logViewEmailStats(user.id, req.ip, req.headers['user-agent'] as string | undefined);

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

    const results: any[] = [];
    const errors: any[] = [];

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

    await logBulkInviteUsers(user.id, establishmentId, invitations.length, results.length, errors.length, req.ip, req.headers['user-agent'] as string | undefined);

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

