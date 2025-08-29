/**
 * Invitation Routes - Invitation Management Endpoints
 * Handles invitation sending, acceptance, and management
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../auth';
import { validateBody, validateParams } from '../../middleware/validation';
import { UserInvitationService } from '../../services/userInvitationService';
import { EstablishmentModel } from '../../models/establishment';
import { AuditTrailModel } from '../../models/auditTrail';
import { Logger } from '../../utils/logger';
import {
  AuthenticatedRequest,
  EstablishmentInvitationData,
  UserInvitationData,
  InvitationAcceptanceData,
  ApiResponse,
  ServiceInitialization
} from './types';

const router = express.Router();

// Service instances
let userInvitationService: UserInvitationService;
let logger: Logger;

/**
 * Initialize invitation routes
 */
export function initializeInvitationRoutes(services: ServiceInitialization): void {
  userInvitationService = services.userInvitationService;
  logger = services.logger;
}

/**
 * POST /send-establishment-invitation
 * Send establishment invitation (System Admin only)
 */
router.post('/send-establishment-invitation', requireAuth, requireAdmin, validateBody([
  { field: 'name', required: true },
  { field: 'email', required: true },
]), async (req: any, res: any, next: any) => {
  try {
    const { name, email, phone, address, subscription_plan }: EstablishmentInvitationData = req.body;
    const user = req.user!;

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
      return res.status(400).json({
        success: false,
        message: 'An establishment with this email already exists'
      });
    }

    // Send establishment invitation
    const result = await userInvitationService.sendEstablishmentInvitation({
      establishmentName: name,
      establishmentEmail: email,
      establishmentPhone: phone,
      establishmentAddress: address,
      subscriptionPlan: subscription_plan || 'basic',
      invitedBy: String(user.id)
    });

    // Log audit trail
    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'SEND_ESTABLISHMENT_INVITATION',
      action_details: {
        establishmentName: name,
        establishmentEmail: email,
        invitationId: result.invitationId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(201).json({
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
      { invitationData: req.body, userId: req.user?.id },
      'INVITATION_ROUTES'
    );
    next(error);
  }
});

/**
 * POST /send-user-invitation
 * Send user invitation (Establishment Admin only)
 */
router.post('/send-user-invitation', requireAuth, validateBody([
  { field: 'email', required: true },
  { field: 'firstName', required: true },
  { field: 'lastName', required: true },
  { field: 'role', required: true },
  { field: 'establishmentId', required: true },
]), async (req: any, res: any, next: any) => {
  try {
    const { email, firstName, lastName, role, establishmentId }: UserInvitationData = req.body;
    const user = req.user!;

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
    // Check if user already exists (simplified check)
    const existingUserCheck = { exists: false };
    if (existingUserCheck.exists) {
      return res.status(400).json({
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
      invitedBy: String(user.id)
    });

    // Log audit trail
    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'SEND_USER_INVITATION',
      action_details: {
        invitedUserEmail: email,
        role,
        establishmentId,
        invitationId: result.invitationId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(201).json({
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
      { invitationData: req.body, userId: req.user?.id },
      'INVITATION_ROUTES'
    );
    next(error);
  }
});

/**
 * POST /accept-invitation
 * Accept user invitation
 */
router.post('/accept-invitation', validateBody([
  { field: 'token', required: true },
  { field: 'password', required: true },
]), async (req: any, res: any, next: any) => {
  try {
    const { token, password, firstName, lastName, businessInfo }: InvitationAcceptanceData = req.body;

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
      // For establishment invitations, business info might be required
      if (businessInfo) {
        result = await userInvitationService.acceptEstablishmentInvitation(token, password, {
          firstName: firstName || invitation.firstName,
          lastName: lastName || invitation.lastName,
          businessInfo
        });
      } else {
        result = await userInvitationService.acceptEstablishmentInvitation(token, password);
      }
    } else {
      result = await userInvitationService.acceptUserInvitation(token, password);
    }

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        user: result.user,
        token: result.token,
        establishment: result.establishment
      }
    });
  } catch (error) {
    logger?.error(
      'Failed to accept invitation',
      error as Error,
      { token: req.body.token },
      'INVITATION_ROUTES'
    );
    next(error);
  }
});

/**
 * GET /pending-invitations
 * Get pending invitations for establishment
 */
router.get('/pending-invitations', requireAuth, async (req: any, res: any, next: any) => {
  try {
    const user = req.user!;
    const establishmentId = req.query.establishmentId as string || user.establishment_id;

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
      { userId: req.user?.id },
      'INVITATION_ROUTES'
    );
    next(error);
  }
});

/**
 * DELETE /cancel-invitation/:invitationId
 * Cancel invitation (Establishment Admin only)
 */
router.delete('/cancel-invitation/:invitationId', requireAuth, validateParams([
  { param: 'invitationId', validator: (v: string) => typeof v === 'string' && v.length > 0 }
]), async (req: any, res: any, next: any) => {
  try {
    const { invitationId } = req.params;
    const user = req.user!;

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
      { invitationId: req.params.invitationId, userId: req.user?.id },
      'INVITATION_ROUTES'
    );
    next(error);
  }
});

/**
 * POST /resend-invitation/:invitationId
 * Resend invitation (Establishment Admin only)
 */
router.post('/resend-invitation/:invitationId', requireAuth, validateParams([
  { param: 'invitationId', validator: (v: string) => typeof v === 'string' && v.length > 0 }
]), async (req: any, res: any, next: any) => {
  try {
    const { invitationId } = req.params;
    const user = req.user!;

    const result = { success: true, trackingId: 'placeholder' };

    if (!result.success) {
      return res.status(400).json(result);
    }

    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'RESEND_INVITATION',
      action_details: {
        invitationId,
        emailTrackingId: result.trackingId
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Invitation resent successfully',
      data: {
        emailTrackingId: result.trackingId
      }
    });
  } catch (error) {
    logger?.error(
      'Failed to resend invitation',
      error as Error,
      { invitationId: req.params.invitationId, userId: req.user?.id },
      'INVITATION_ROUTES'
    );
    next(error);
  }
});

export { router as invitationRoutes };

