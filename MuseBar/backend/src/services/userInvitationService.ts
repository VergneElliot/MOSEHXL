/**
 * Professional User Invitation Service
 * Handles establishment and user invitations with email integration
 */

import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { pool } from '../app';
import { EmailService } from './email';
import { EstablishmentModel, CreateEstablishmentData } from '../models/establishment';
import { Logger } from '../utils/logger';
import { EnvironmentConfig } from '../config/environment';

/**
 * Invitation types
 */
export type InvitationType = 'establishment' | 'user';

/**
 * Establishment invitation data
 */
export interface EstablishmentInvitationData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subscription_plan?: 'basic' | 'premium' | 'enterprise';
  inviterUserId: string;
  inviterName: string;
}

/**
 * User invitation data
 */
export interface UserInvitationData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'cashier' | 'manager' | 'supervisor' | 'establishment_admin';
  establishmentId: string;
  establishmentName: string;
  inviterUserId: string;
  inviterName: string;
}

/**
 * Invitation result
 */
export interface InvitationResult {
  success: boolean;
  invitationId?: string;
  establishmentId?: string;
  message: string;
  emailSent: boolean;
  trackingId?: string;
}

/**
 * Professional User Invitation Service
 */
export class UserInvitationService {
  private static instance: UserInvitationService;
  private logger: Logger;
  private config: EnvironmentConfig;
  private emailService: EmailService;

  private constructor(config: EnvironmentConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.emailService = EmailService.getInstance(config, logger);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: EnvironmentConfig, logger?: Logger): UserInvitationService {
    if (!UserInvitationService.instance && config && logger) {
      UserInvitationService.instance = new UserInvitationService(config, logger);
    }
    return UserInvitationService.instance;
  }

  /**
   * Send establishment invitation (System Admin only)
   */
  public async sendEstablishmentInvitation(data: EstablishmentInvitationData): Promise<InvitationResult> {
    try {
      // Validate establishment data
      const validation = EstablishmentModel.validateEstablishmentData(data);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Validation failed: ${validation.errors.join(', ')}`,
          emailSent: false
        };
      }

      // Check if establishment already exists
      const existingEstablishment = await EstablishmentModel.getByEmail(data.email);
      if (existingEstablishment) {
        return {
          success: false,
          message: 'An establishment with this email already exists',
          emailSent: false
        };
      }

      // Create establishment invitation record
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

      // Send invitation email
      const invitationUrl = `${process.env.FRONTEND_URL}/accept-establishment-invitation?token=${invitationToken}`;
      
      const emailTrackingId = await this.emailService.sendTemplateEmail(
        'establishment_invitation',
        data.email,
        {
          recipientName: data.name,
          establishmentName: data.name,
          inviterName: data.inviterName,
          invitationUrl,
          expirationDate: expiresAt.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        }
      );

      this.logger.info(
        'Establishment invitation sent successfully',
        {
          invitationId,
          establishmentEmail: data.email,
          establishmentName: data.name,
          inviterUserId: data.inviterUserId,
          emailTrackingId
        },
        'USER_INVITATION_SERVICE'
      );

      return {
        success: true,
        invitationId,
        message: 'Establishment invitation sent successfully',
        emailSent: true,
        trackingId: emailTrackingId
      };

    } catch (error) {
      this.logger.error(
        'Failed to send establishment invitation',
        error as Error,
        { establishmentData: data },
        'USER_INVITATION_SERVICE'
      );

      return {
        success: false,
        message: 'Failed to send establishment invitation',
        emailSent: false
      };
    }
  }

  /**
   * Send user invitation (Establishment Admin only)
   */
  public async sendUserInvitation(data: UserInvitationData): Promise<InvitationResult> {
    try {
      // Validate establishment exists
      const establishment = await EstablishmentModel.getById(data.establishmentId);
      if (!establishment) {
        return {
          success: false,
          message: 'Establishment not found',
          emailSent: false
        };
      }

      // Check if user already exists in this establishment
      const existingUser = await pool.query(`
        SELECT id FROM users 
        WHERE email = $1 AND establishment_id = $2
      `, [data.email, data.establishmentId]);

      if (existingUser.rows.length > 0) {
        return {
          success: false,
          message: 'User already exists in this establishment',
          emailSent: false
        };
      }

      // Create user invitation record
      const invitationId = randomUUID();
      const invitationToken = randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await pool.query(`
        INSERT INTO user_invitations (
          id, email, establishment_id, inviter_user_id, inviter_name,
          establishment_name, role, first_name, last_name,
          invitation_token, expires_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        invitationId,
        data.email,
        data.establishmentId,
        data.inviterUserId,
        data.inviterName,
        data.establishmentName,
        data.role,
        data.firstName,
        data.lastName,
        invitationToken,
        expiresAt,
        'pending'
      ]);

      // Send invitation email
      const invitationUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${invitationToken}`;
      
      const emailTrackingId = await this.emailService.sendTemplateEmail(
        'user_invitation',
        data.email,
        {
          recipientName: `${data.firstName} ${data.lastName}`,
          establishmentName: data.establishmentName,
          inviterName: data.inviterName,
          invitationUrl,
          expirationDate: expiresAt.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        }
      );

      this.logger.info(
        'User invitation sent successfully',
        {
          invitationId,
          userEmail: data.email,
          establishmentId: data.establishmentId,
          role: data.role,
          inviterUserId: data.inviterUserId,
          emailTrackingId
        },
        'USER_INVITATION_SERVICE'
      );

      return {
        success: true,
        invitationId,
        message: 'User invitation sent successfully',
        emailSent: true,
        trackingId: emailTrackingId
      };

    } catch (error) {
      this.logger.error(
        'Failed to send user invitation',
        error as Error,
        { userData: data },
        'USER_INVITATION_SERVICE'
      );

      return {
        success: false,
        message: 'Failed to send user invitation',
        emailSent: false
      };
    }
  }

  /**
   * Accept establishment invitation
   */
  public async acceptEstablishmentInvitation(token: string, password: string): Promise<InvitationResult> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Find invitation
      const invitationResult = await client.query(`
        SELECT * FROM user_invitations 
        WHERE invitation_token = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
      `, [token]);

      if (invitationResult.rows.length === 0) {
        return {
          success: false,
          message: 'Invalid or expired invitation token',
          emailSent: false
        };
      }

      const invitation = invitationResult.rows[0];

      // Create establishment
      const establishmentData: CreateEstablishmentData = {
        name: invitation.establishment_name,
        email: invitation.email,
        subscription_plan: 'basic'
      };

      const establishment = await EstablishmentModel.createEstablishment(establishmentData);

      // Create establishment admin user
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const userResult = await client.query(`
        INSERT INTO users (
          email, password_hash, first_name, last_name, role,
          establishment_id, is_admin, email_verified, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        invitation.email,
        hashedPassword,
        'Admin',
        invitation.establishment_name,
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
        'USER_INVITATION_SERVICE'
      );

      return {
        success: true,
        establishmentId: establishment.id,
        message: 'Establishment created successfully',
        emailSent: false
      };

    } catch (error) {
      await client.query('ROLLBACK');
      
      this.logger.error(
        'Failed to accept establishment invitation',
        error as Error,
        { token },
        'USER_INVITATION_SERVICE'
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
  public async acceptUserInvitation(token: string, password: string): Promise<InvitationResult> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Find invitation
      const invitationResult = await client.query(`
        SELECT * FROM user_invitations 
        WHERE invitation_token = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
      `, [token]);

      if (invitationResult.rows.length === 0) {
        return {
          success: false,
          message: 'Invalid or expired invitation token',
          emailSent: false
        };
      }

      const invitation = invitationResult.rows[0];

      // Check if user already exists
      const existingUser = await client.query(`
        SELECT id FROM users 
        WHERE email = $1 AND establishment_id = $2
      `, [invitation.email, invitation.establishment_id]);

      if (existingUser.rows.length > 0) {
        return {
          success: false,
          message: 'User already exists in this establishment',
          emailSent: false
        };
      }

      // Create user
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const userResult = await client.query(`
        INSERT INTO users (
          email, password_hash, first_name, last_name, role,
          establishment_id, email_verified, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        invitation.email,
        hashedPassword,
        invitation.first_name,
        invitation.last_name,
        invitation.role,
        invitation.establishment_id,
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
          establishmentId: invitation.establishment_id,
          role: invitation.role
        },
        'USER_INVITATION_SERVICE'
      );

      return {
        success: true,
        message: 'User account created successfully',
        emailSent: false
      };

    } catch (error) {
      await client.query('ROLLBACK');
      
      this.logger.error(
        'Failed to accept user invitation',
        error as Error,
        { token },
        'USER_INVITATION_SERVICE'
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
   * Get invitation by token
   */
  public async getInvitationByToken(token: string): Promise<any | null> {
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
        'USER_INVITATION_SERVICE'
      );
      throw error;
    }
  }

  /**
   * Get pending invitations for establishment
   */
  public async getPendingInvitations(establishmentId: string): Promise<any[]> {
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
        'USER_INVITATION_SERVICE'
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
        SET status = 'cancelled'
        WHERE id = $1 AND status = 'pending'
      `, [invitationId]);

             if (result.rowCount && result.rowCount > 0) {
        this.logger.info(
          'Invitation cancelled successfully',
          { invitationId, cancelledBy: userId },
          'USER_INVITATION_SERVICE'
        );
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        'Failed to cancel invitation',
        error as Error,
        { invitationId, userId },
        'USER_INVITATION_SERVICE'
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
          'USER_INVITATION_SERVICE'
        );
      }

      return expiredCount;
    } catch (error) {
      this.logger.error(
        'Failed to cleanup expired invitations',
        error as Error,
        {},
        'USER_INVITATION_SERVICE'
      );
      throw error;
    }
  }
} 