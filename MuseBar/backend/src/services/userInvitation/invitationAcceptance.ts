/**
 * Invitation Acceptance Service
 * Logic for accepting user and establishment invitations
 */

import bcrypt from 'bcrypt';
import { pool } from '../../app';
import { Logger } from '../../utils/logger';
import { InvitationQueries } from '../../utils/database';
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

      const invitation = await InvitationQueries.getInvitationByToken(client, acceptanceData.token);
      if (!invitation) {
        return {
          success: false,
          message: 'Invalid or expired invitation token',
          emailSent: false
        };
      }

      const invitationRecord = invitation as InvitationRecord;

      // Create establishment
      const establishmentData: CreateEstablishmentData = {
        name: invitationRecord.establishment_name ?? invitationRecord.email,
        email: invitationRecord.email,
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
        invitationRecord.email,
        hashedPassword,
        acceptanceData.firstName || 'Admin',
        acceptanceData.lastName || invitationRecord.establishment_name,
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
      `, [invitationRecord.id]);

      await client.query('COMMIT');

      this.logger.info(
        'Establishment invitation accepted successfully',
        {
          invitationId: invitationRecord.id,
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

      const invitation = await InvitationQueries.getInvitationByToken(client, acceptanceData.token);
      if (!invitation) {
        return {
          success: false,
          message: 'Invalid or expired invitation token',
          emailSent: false
        };
      }

      const invitationRecord = invitation as InvitationRecord;

      // Verify establishment still exists
      const establishment = await EstablishmentModel.getById(invitationRecord.establishment_id!);
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
        invitationRecord.email,
        hashedPassword,
        acceptanceData.firstName || 'User',
        acceptanceData.lastName || 'User',
        invitationRecord.role,
        invitationRecord.establishment_id,
        invitationRecord.role === 'establishment_admin',
        true,
        true
      ]);

      // Update invitation status
      await client.query(`
        UPDATE user_invitations 
        SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [invitationRecord.id]);

      await client.query('COMMIT');

      this.logger.info(
        'User invitation accepted successfully',
        {
          invitationId: invitationRecord.id,
          userId: userResult.rows[0].id,
          userEmail: invitationRecord.email,
          role: invitationRecord.role,
          establishmentId: invitationRecord.establishment_id
        },
        'INVITATION_ACCEPTANCE'
      );

      return {
        success: true,
        userId: userResult.rows[0].id,
        establishmentId: invitationRecord.establishment_id,
        message: 'User account created successfully',
        emailSent: false
      };

    } catch (error) {
      await client.query('ROLLBACK');
      
      this.logger.error(
        'Failed to accept user invitation',
        error as Error,
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
    void userId;
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
        undefined,
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
      const row = await InvitationQueries.getInvitationByToken(pool, token);
      return row as InvitationRecord | null;

    } catch (error) {
      this.logger.error(
        'Failed to get invitation details',
        error as Error,
        'INVITATION_ACCEPTANCE'
      );
      throw error;
    }
  }
}

