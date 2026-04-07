/**
 * Invitation Operations
 * Handles invitation validation, status checks, and completion
 */

import { PoolClient } from 'pg';
import { InvitationQueries } from '../../utils/database';
import {
  InvitationValidation,
  InvitationData,
} from './types';
import { Logger } from '../../utils/logger';

/**
 * Invitation database operations
 */
export class InvitationOperations {
  private static logger = Logger.getInstance();

  private static async withClient<T>(pool: { connect: () => Promise<PoolClient> }, op: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      return await op(client);
    } finally {
      client.release();
    }
  }

  /**
   * Validate invitation token
   */
  static async validateInvitation(
    pool: { connect: () => Promise<PoolClient> },
    token: string
  ): Promise<InvitationValidation> {
    try {
      if (!token) {
        return {
          isValid: false,
          token,
          error: 'No invitation token provided'
        };
      }

      // Check if invitation exists and is valid
      const invitationQuery = await this.withClient(pool, (client) => client.query(`
        SELECT ui.*, e.id as establishment_id, e.name as establishment_name, e.email as establishment_email
        FROM user_invitations ui
        LEFT JOIN establishments e ON ui.establishment_id = e.id
        WHERE ui.invitation_token = $1 
          AND ui.status = 'pending'
          AND ui.expires_at > CURRENT_TIMESTAMP
      `, [token]));

      if (invitationQuery.rows.length === 0) {
        return {
          isValid: false,
          token,
          error: 'Invalid or expired invitation token'
        };
      }

      const invitation = invitationQuery.rows[0] as {
        id: string;
        establishment_id: string;
        establishment_name: string;
        establishment_email: string;
        expires_at: Date;
      };

      if (!invitation.establishment_id) {
        return {
          isValid: false,
          token,
          error: 'Invitation not associated with an establishment'
        };
      }

      // Check establishment status
      const establishment = await this.withClient(pool, (client) => client.query(`
        SELECT id, name, email, status
        FROM establishments
        WHERE id = $1
      `, [invitation.establishment_id]));

      if (establishment.rows[0]?.status === 'active') {
        return {
          isValid: false,
          token,
          error: 'Establishment setup already completed'
        };
      }

      const validInvitation: InvitationData = {
        establishment_id: invitation.establishment_id,
        establishment_name: invitation.establishment_name,
        establishment_status: (establishment.rows[0] as { status?: string } | undefined)?.status,
        invitation_id: invitation.id,
        expires_at: invitation.expires_at
      };

      return {
        isValid: true,
        token,
        ...validInvitation
      };

    } catch (error) {
      this.logger.error('Error validating invitation:', error as Error);
      return {
        isValid: false,
        token,
        error: 'Database error during invitation validation'
      };
    }
  }

  /**
   * Check setup status for invitation
   */
  static async checkSetupStatus(
    pool: { connect: () => Promise<PoolClient> },
    token: string
  ) {
    try {
      // Get invitation details
      const invitationQuery = await this.withClient(pool, (client) => client.query(`
        SELECT ui.*, e.status as establishment_status, e.name as establishment_name
        FROM user_invitations ui
        LEFT JOIN establishments e ON ui.establishment_id = e.id
        WHERE ui.invitation_token = $1
      `, [token]));

      if (invitationQuery.rows.length === 0) {
        return {
          success: false,
          error: 'Invalid invitation token'
        };
      }

      const invitation = invitationQuery.rows[0] as {
        email: string;
        role: string;
        establishment_id: string;
        establishment_name: string;
        status: string;
        expires_at: Date;
        establishment_status?: string;
      };

      return {
        success: true,
        data: {
          invitation: {
            email: invitation.email,
            role: invitation.role,
            establishment_id: invitation.establishment_id,
            establishment_name: invitation.establishment_name,
            status: invitation.status,
            expires_at: invitation.expires_at
          },
          establishment: {
            status: invitation.establishment_status
          }
        }
      };

    } catch (error) {
      this.logger.error('Error checking setup status:', error as Error);
      return {
        success: false,
        error: 'Database error'
      };
    }
  }

  /**
   * Validate invitation for setup process
   */
  static async validateInvitationForSetup(
    client: PoolClient,
    token: string
  ) {
    try {
      const invitation = await InvitationQueries.getInvitationByToken(client, token);
      if (!invitation) {
        throw new Error('Invalid or expired invitation token');
      }
      if (invitation.establishment_status === 'active') {
        throw new Error('Establishment setup already completed');
      }
      return invitation;

    } catch (error) {
      this.logger.error('Error validating invitation for setup:', error as Error);
      throw error;
    }
  }

  /**
   * Complete invitation process
   */
  static async completeInvitation(
    client: PoolClient,
    token: string,
    userId: number
  ): Promise<void> {
    try {
      await client.query(`
        UPDATE user_invitations 
        SET status = 'completed', 
            accepted_at = CURRENT_TIMESTAMP,
            user_id = $2
        WHERE invitation_token = $1
      `, [token, userId]);

      this.logger.info(`Completed invitation for token: ${token}, user: ${userId}`);

    } catch (error) {
      this.logger.error('Error completing invitation:', error as Error);
      throw new Error('Failed to complete invitation');
    }
  }
}
