/**
 * Invitation Acceptance Service
 * Logic for accepting user and establishment invitations
 */

import bcrypt from 'bcrypt';
import { pool } from '../../app';
import { Logger } from '../../utils/logger';
import { EstablishmentModel, CreateEstablishmentData } from '../../models/establishment';
import { 
  InvitationAcceptanceData, 
  InvitationResult,
  InvitationRecord
} from './types';

export class InvitationAcceptance {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Accept establishment invitation
   */
  public async acceptEstablishmentInvitation(
    acceptanceData: InvitationAcceptanceData
  ): Promise<InvitationResult> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Find invitation
      const invitationResult = await client.query(`
        SELECT * FROM user_invitations 
        WHERE invitation_token = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
      `, [acceptanceData.token]);

      if (invitationResult.rows.length === 0) {
        return {
          success: false,
          message: 'Invalid or expired invitation token',
          emailSent: false
        };
      }

      const invitation: InvitationRecord = invitationResult.rows[0];

      // Create establishment
      const establishmentData: CreateEstablishmentData = {
        name: invitation.establishment_name,
        email: invitation.email,
        subscription_plan: 'basic'
      };

      const establishment = await EstablishmentModel.createEstablishment(establishmentData);

      // Create establishment admin user
      const hashedPassword = await bcrypt.hash(acceptanceData.password, 12);
      
      const userResult = await client.query(`
        INSERT INTO users (
          email, password_hash, first_name, last_name, role,
          establishment_id, is_admin, email_verified, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        invitation.email,
        hashedPassword,
        acceptanceData.firstName || 'Admin',
        acceptanceData.lastName || invitation.establishment_name,
        'establishment_admin',
        establishment.id,
        true,
        true,
        true
      ]);

      // Update invitation status
      await client.query(`
        UPDATE user_invitations 
        SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [invitation.id]);

      await client.query('COMMIT');

      this.logger.info(
        'Establishment invitation accepted successfully',
        {
          invitationId: invitation.id,
          establishmentId: establishment.id,
          establishmentName: establishment.name,
          adminUserId: userResult.rows[0].id
        },
        'INVITATION_ACCEPTANCE'
      );

      return {
        success: true,
        establishmentId: establishment.id,
        userId: userResult.rows[0].id,
        message: 'Establishment created successfully',
        emailSent: false
      };

    } catch (error) {
      await client.query('ROLLBACK');
      
      this.logger.error(
        'Failed to accept establishment invitation',
        error as Error,
        { token: acceptanceData.token },
        'INVITATION_ACCEPTANCE'
      );

      return {
        success: false,
        message: 'Failed to create establishment',
        emailSent: false
      };
    } finally {
      client.release();
    }
  }

  /**
   * Accept user invitation
   */
  public async acceptUserInvitation(
    acceptanceData: InvitationAcceptanceData
  ): Promise<InvitationResult> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Find invitation
      const invitationResult = await client.query(`
        SELECT * FROM user_invitations 
        WHERE invitation_token = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
      `, [acceptanceData.token]);

      if (invitationResult.rows.length === 0) {
        return {
          success: false,
          message: 'Invalid or expired invitation token',
          emailSent: false
        };
      }

      const invitation: InvitationRecord = invitationResult.rows[0];

      // Verify establishment still exists
      const establishment = await EstablishmentModel.getById(invitation.establishment_id!);
      if (!establishment) {
        return {
          success: false,
          message: 'Associated establishment no longer exists',
          emailSent: false
        };
      }

      // Create user
      const hashedPassword = await bcrypt.hash(acceptanceData.password, 12);
      
      const userResult = await client.query(`
        INSERT INTO users (
          email, password_hash, first_name, last_name, role,
          establishment_id, is_admin, email_verified, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        invitation.email,
        hashedPassword,
        acceptanceData.firstName || 'User',
        acceptanceData.lastName || 'User',
        invitation.role,
        invitation.establishment_id,
        invitation.role === 'establishment_admin',
        true,
        true
      ]);

      // Update invitation status
      await client.query(`
        UPDATE user_invitations 
        SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [invitation.id]);

      await client.query('COMMIT');

      this.logger.info(
        'User invitation accepted successfully',
        {
          invitationId: invitation.id,
          userId: userResult.rows[0].id,
          userEmail: invitation.email,
          role: invitation.role,
          establishmentId: invitation.establishment_id
        },
        'INVITATION_ACCEPTANCE'
      );

      return {
        success: true,
        userId: userResult.rows[0].id,
        establishmentId: invitation.establishment_id,
        message: 'User account created successfully',
        emailSent: false
      };

    } catch (error) {
      await client.query('ROLLBACK');
      
      this.logger.error(
        'Failed to accept user invitation',
        error as Error,
        { token: acceptanceData.token },
        'INVITATION_ACCEPTANCE'
      );

      return {
        success: false,
        message: 'Failed to create user account',
        emailSent: false
      };
    } finally {
      client.release();
    }
  }

  /**
   * Resend invitation
   */
  public async resendInvitation(invitationId: string, userId: string): Promise<InvitationResult> {
    try {
      // Get invitation details
      const invitationResult = await pool.query(`
        SELECT * FROM user_invitations 
        WHERE id = $1 AND status = 'pending'
      `, [invitationId]);

      if (invitationResult.rows.length === 0) {
        return {
          success: false,
          message: 'Invitation not found or already processed',
          emailSent: false
        };
      }

      const invitation: InvitationRecord = invitationResult.rows[0];

      // Check if invitation is expired and extend it
      const now = new Date();
      if (invitation.expires_at <= now) {
        const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        
        await pool.query(`
          UPDATE user_invitations 
          SET expires_at = $1
          WHERE id = $2
        `, [newExpiresAt, invitationId]);

        invitation.expires_at = newExpiresAt;
      }

      this.logger.info(
        'Invitation resend prepared',
        {
          invitationId,
          email: invitation.email,
          role: invitation.role,
          requestedBy: userId
        },
        'INVITATION_ACCEPTANCE'
      );

      return {
        success: true,
        invitationId,
        message: 'Invitation ready for resending',
        emailSent: false // Email sending is handled by the email service
      };

    } catch (error) {
      this.logger.error(
        'Failed to prepare invitation resend',
        error as Error,
        { invitationId, userId },
        'INVITATION_ACCEPTANCE'
      );

      return {
        success: false,
        message: 'Failed to resend invitation',
        emailSent: false
      };
    }
  }

  /**
   * Get invitation details for acceptance form
   */
  public async getInvitationDetails(token: string): Promise<InvitationRecord | null> {
    try {
      const result = await pool.query(`
        SELECT * FROM user_invitations 
        WHERE invitation_token = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
      `, [token]);

      return result.rows[0] || null;

    } catch (error) {
      this.logger.error(
        'Failed to get invitation details',
        error as Error,
        { token },
        'INVITATION_ACCEPTANCE'
      );
      throw error;
    }
  }
}

