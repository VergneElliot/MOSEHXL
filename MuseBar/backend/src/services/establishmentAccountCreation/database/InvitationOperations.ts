import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';
import { AuditTrailModel } from '../../../models/auditTrail';

export interface InvitationCompletionData {
  token: string;
  establishmentId: string;
  userEmail: string;
}

export interface CompletedInvitation {
  id: string;
  token: string;
  establishmentId: string;
  userEmail: string;
  completedAt: Date;
}

export class InvitationOperations {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Mark invitation as completed/accepted
   */
  public async completeInvitation(
    client: PoolClient,
    completionData: InvitationCompletionData,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<CompletedInvitation> {
    const { token, establishmentId, userEmail } = completionData;

    try {
      // 1. Update invitation status to completed
      const updateResult = await client.query(
        `UPDATE user_invitations 
         SET 
           status = 'completed',
           accepted_at = NOW(),
           completed_by_user_id = $1,
           updated_at = NOW()
         WHERE invitation_token = $2 AND establishment_id = $3
         RETURNING id, invitation_token, establishment_id, email, accepted_at`,
        [userId, token, establishmentId]
      );

      if (updateResult.rows.length === 0) {
        throw new Error(`Invitation with token ${token.substring(0, 8)}... not found or already completed`);
      }

      const invitation = updateResult.rows[0];
      this.logger.info('Invitation marked as completed', { 
        invitationId: invitation.id,
        token: token.substring(0, 8) + '...',
        establishmentId: invitation.establishment_id,
        userEmail: invitation.email
      });

      // 2. Log audit trail
      await AuditTrailModel.logAction({
        user_id: userId,
        action_type: 'INVITATION_COMPLETED',
        resource_type: 'INVITATION',
        resource_id: invitation.id,
        action_details: {
          invitation_token: token.substring(0, 8) + '...',
          establishment_id: establishmentId,
          user_email: userEmail,
          completion_type: 'account_creation'
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      this.logger.info('Audit trail logged for invitation completion', { 
        invitationId: invitation.id, 
        userId 
      });

      return {
        id: invitation.id,
        token: invitation.invitation_token,
        establishmentId: invitation.establishment_id,
        userEmail: invitation.email,
        completedAt: invitation.accepted_at
      };

    } catch (error) {
      this.logger.error('Failed to complete invitation', error as Error, { 
        token: token.substring(0, 8) + '...',
        establishmentId 
      });
      throw new Error(`Failed to complete invitation: ${(error as Error).message}`);
    }
  }

  /**
   * Validate invitation completion data
   */
  public validateInvitationCompletionData(completionData: InvitationCompletionData): { isValid: boolean; error?: string } {
    const { token, establishmentId, userEmail } = completionData;

    if (!token || token.trim() === '') {
      return { isValid: false, error: 'Invitation token is required' };
    }

    if (!establishmentId || establishmentId.trim() === '') {
      return { isValid: false, error: 'Establishment ID is required' };
    }

    if (!userEmail || userEmail.trim() === '') {
      return { isValid: false, error: 'User email is required' };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    return { isValid: true };
  }

  /**
   * Check invitation status and validity
   */
  public async checkInvitationStatus(
    client: PoolClient, 
    token: string
  ): Promise<{
    exists: boolean;
    isValid: boolean;
    status?: string;
    expiresAt?: Date;
    establishmentId?: string;
    userEmail?: string;
    error?: string;
  }> {
    try {
      const result = await client.query(
        `SELECT 
           id, 
           invitation_token, 
           establishment_id, 
           email, 
           status, 
           expires_at, 
           created_at,
           accepted_at
         FROM user_invitations 
         WHERE invitation_token = $1`,
        [token]
      );

      if (result.rows.length === 0) {
        this.logger.debug('Invitation not found', { token: token.substring(0, 8) + '...' });
        return { exists: false, isValid: false, error: 'Invitation not found' };
      }

      const invitation = result.rows[0];
      const now = new Date();
      const expiresAt = new Date(invitation.expires_at);

      // Check if invitation is expired
      if (now > expiresAt) {
        this.logger.debug('Invitation expired', { 
          token: token.substring(0, 8) + '...',
          expiresAt: invitation.expires_at
        });
        return {
          exists: true,
          isValid: false,
          status: invitation.status,
          expiresAt: invitation.expires_at,
          establishmentId: invitation.establishment_id,
          userEmail: invitation.email,
          error: 'Invitation has expired'
        };
      }

      // Check if invitation is already completed
      if (invitation.status === 'completed' || invitation.accepted_at) {
        this.logger.debug('Invitation already completed', { 
          token: token.substring(0, 8) + '...',
          status: invitation.status
        });
        return {
          exists: true,
          isValid: false,
          status: invitation.status,
          expiresAt: invitation.expires_at,
          establishmentId: invitation.establishment_id,
          userEmail: invitation.email,
          error: 'Invitation has already been completed'
        };
      }

      // Check if invitation is cancelled
      if (invitation.status === 'cancelled') {
        this.logger.debug('Invitation cancelled', { 
          token: token.substring(0, 8) + '...',
          status: invitation.status
        });
        return {
          exists: true,
          isValid: false,
          status: invitation.status,
          expiresAt: invitation.expires_at,
          establishmentId: invitation.establishment_id,
          userEmail: invitation.email,
          error: 'Invitation has been cancelled'
        };
      }

      this.logger.debug('Invitation status check completed', { 
        token: token.substring(0, 8) + '...',
        status: invitation.status,
        isValid: true
      });

      return {
        exists: true,
        isValid: true,
        status: invitation.status,
        expiresAt: invitation.expires_at,
        establishmentId: invitation.establishment_id,
        userEmail: invitation.email
      };

    } catch (error) {
      this.logger.error('Failed to check invitation status', error as Error, { 
        token: token.substring(0, 8) + '...' 
      });
      throw new Error(`Failed to check invitation status: ${(error as Error).message}`);
    }
  }

  /**
   * Clean up expired invitations
   */
  public async cleanupExpiredInvitations(
    client: PoolClient,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ cleanedCount: number }> {
    try {
      const result = await client.query(
        `DELETE FROM user_invitations 
         WHERE expires_at < NOW() AND status = 'pending'
         RETURNING id`,
        []
      );

      const cleanedCount = result.rows.length;
      this.logger.info('Expired invitations cleaned up', { cleanedCount });

      if (cleanedCount > 0) {
        // Log audit trail for cleanup
        await AuditTrailModel.logAction({
          user_id: userId,
          action_type: 'EXPIRED_INVITATIONS_CLEANED_UP',
          resource_type: 'INVITATION',
          resource_id: 'bulk_cleanup',
          action_details: {
            cleaned_count: cleanedCount,
            cleanup_type: 'expired_invitations'
          },
          ip_address: ipAddress,
          user_agent: userAgent
        });
      }

      return { cleanedCount };

    } catch (error) {
      this.logger.error('Failed to cleanup expired invitations', error as Error);
      throw new Error(`Failed to cleanup expired invitations: ${(error as Error).message}`);
    }
  }

  /**
   * Get invitation details by token
   */
  public async getInvitationDetails(
    client: PoolClient, 
    token: string
  ): Promise<{
    exists: boolean;
    invitation?: {
      id: string;
      establishmentId: string;
      userEmail: string;
      status: string;
      expiresAt: Date;
      createdAt: Date;
    };
  }> {
    try {
      const result = await client.query(
        `SELECT 
           id, 
           establishment_id, 
           email, 
           status, 
           expires_at, 
           created_at
         FROM user_invitations 
         WHERE invitation_token = $1`,
        [token]
      );

      if (result.rows.length === 0) {
        return { exists: false };
      }

      const invitation = result.rows[0];
      this.logger.debug('Invitation details retrieved', { 
        token: token.substring(0, 8) + '...',
        invitationId: invitation.id
      });

      return {
        exists: true,
        invitation: {
          id: invitation.id,
          establishmentId: invitation.establishment_id,
          userEmail: invitation.email,
          status: invitation.status,
          expiresAt: invitation.expires_at,
          createdAt: invitation.created_at
        }
      };

    } catch (error) {
      this.logger.error('Failed to get invitation details', error as Error, { 
        token: token.substring(0, 8) + '...' 
      });
      throw new Error(`Failed to get invitation details: ${(error as Error).message}`);
    }
  }
}
