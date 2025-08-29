/**
 * Invitation Creator
 * Logic for creating user and establishment invitations
 */

import { randomUUID } from 'crypto';
import { pool } from '../../app';
import { Logger } from '../../utils/logger';
import { 
  EstablishmentInvitationData, 
  UserInvitationData, 
  InvitationResult,
  InvitationRecord
} from './types';

export class InvitationCreator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Create establishment invitation record
   */
  public async createEstablishmentInvitation(data: EstablishmentInvitationData): Promise<InvitationResult> {
    try {
      const invitationId = randomUUID();
      const invitationToken = randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await pool.query(`
        INSERT INTO user_invitations (
          id, email, inviter_user_id, inviter_name, establishment_name,
          role, invitation_token, expires_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        invitationId,
        data.email,
        data.inviterUserId,
        data.inviterName,
        data.name,
        'establishment_admin',
        invitationToken,
        expiresAt,
        'pending'
      ]);

      this.logger.info(
        'Establishment invitation record created',
        {
          invitationId,
          establishmentEmail: data.email,
          establishmentName: data.name,
          inviterUserId: data.inviterUserId
        },
        'INVITATION_CREATOR'
      );

      return {
        success: true,
        invitationId,
        message: 'Establishment invitation created successfully',
        emailSent: false // Email sending is handled separately
      };

    } catch (error) {
      this.logger.error(
        'Failed to create establishment invitation record',
        error as Error,
        { establishmentData: data },
        'INVITATION_CREATOR'
      );

      return {
        success: false,
        message: 'Failed to create establishment invitation',
        emailSent: false
      };
    }
  }

  /**
   * Create user invitation record
   */
  public async createUserInvitation(data: UserInvitationData): Promise<InvitationResult> {
    try {
      const invitationId = randomUUID();
      const invitationToken = randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await pool.query(`
        INSERT INTO user_invitations (
          id, email, inviter_user_id, inviter_name, establishment_id,
          establishment_name, role, invitation_token, expires_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        invitationId,
        data.email,
        data.inviterUserId,
        data.inviterName,
        data.establishmentId,
        data.establishmentName,
        data.role,
        invitationToken,
        expiresAt,
        'pending'
      ]);

      this.logger.info(
        'User invitation record created',
        {
          invitationId,
          userEmail: data.email,
          role: data.role,
          establishmentId: data.establishmentId,
          inviterUserId: data.inviterUserId
        },
        'INVITATION_CREATOR'
      );

      return {
        success: true,
        invitationId,
        message: 'User invitation created successfully',
        emailSent: false // Email sending is handled separately
      };

    } catch (error) {
      this.logger.error(
        'Failed to create user invitation record',
        error as Error,
        { userData: data },
        'INVITATION_CREATOR'
      );

      return {
        success: false,
        message: 'Failed to create user invitation',
        emailSent: false
      };
    }
  }

  /**
   * Get invitation by ID
   */
  public async getInvitationById(invitationId: string): Promise<InvitationRecord | null> {
    try {
      const result = await pool.query(`
        SELECT * FROM user_invitations WHERE id = $1
      `, [invitationId]);

      return result.rows[0] || null;

    } catch (error) {
      this.logger.error(
        'Failed to get invitation by ID',
        error as Error,
        { invitationId },
        'INVITATION_CREATOR'
      );
      throw error;
    }
  }

  /**
   * Get invitation by token
   */
  public async getInvitationByToken(token: string): Promise<InvitationRecord | null> {
    try {
      const result = await pool.query(`
        SELECT * FROM user_invitations 
        WHERE invitation_token = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
      `, [token]);

      return result.rows[0] || null;

    } catch (error) {
      this.logger.error(
        'Failed to get invitation by token',
        error as Error,
        { token },
        'INVITATION_CREATOR'
      );
      throw error;
    }
  }

  /**
   * Get pending invitations for establishment
   */
  public async getPendingInvitations(establishmentId: string): Promise<InvitationRecord[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM user_invitations 
        WHERE establishment_id = $1 AND status = 'pending'
        ORDER BY created_at DESC
      `, [establishmentId]);

      return result.rows;

    } catch (error) {
      this.logger.error(
        'Failed to get pending invitations',
        error as Error,
        { establishmentId },
        'INVITATION_CREATOR'
      );
      throw error;
    }
  }

  /**
   * Cancel invitation
   */
  public async cancelInvitation(invitationId: string, userId: string): Promise<boolean> {
    try {
      const result = await pool.query(`
        UPDATE user_invitations 
        SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'pending'
      `, [invitationId]);

      if (result.rowCount && result.rowCount > 0) {
        this.logger.info(
          'Invitation cancelled successfully',
          { invitationId, cancelledBy: userId },
          'INVITATION_CREATOR'
        );
        return true;
      }

      return false;

    } catch (error) {
      this.logger.error(
        'Failed to cancel invitation',
        error as Error,
        { invitationId, userId },
        'INVITATION_CREATOR'
      );
      throw error;
    }
  }

  /**
   * Clean up expired invitations
   */
  public async cleanupExpiredInvitations(): Promise<number> {
    try {
      const result = await pool.query(`
        UPDATE user_invitations 
        SET status = 'expired'
        WHERE status = 'pending' AND expires_at < CURRENT_TIMESTAMP
      `);

      const expiredCount = result.rowCount || 0;

      if (expiredCount > 0) {
        this.logger.info(
          'Expired invitations cleaned up',
          { expiredCount },
          'INVITATION_CREATOR'
        );
      }

      return expiredCount;

    } catch (error) {
      this.logger.error(
        'Failed to cleanup expired invitations',
        error as Error,
        {},
        'INVITATION_CREATOR'
      );
      throw error;
    }
  }
}

