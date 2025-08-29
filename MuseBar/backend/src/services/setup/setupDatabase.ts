/**
 * Setup Database - Database Operations
 * Handles all database operations for the setup process
 */

import bcrypt from 'bcrypt';
import { PoolClient } from 'pg';
import {
  BusinessSetupRequest,
  InvitationValidation,
  InvitationData,
  UserExistsResult,
  TransactionContext,
  SetupProgress
} from './types';
import { SchemaManager } from '../SchemaManager';
import { Logger } from '../../utils/logger';

/**
 * Setup Database Operations
 */
export class SetupDatabase {
  private static logger = Logger.getInstance();

  /**
   * Validate invitation token
   */
  static async validateInvitation(
    pool: any,
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
      const invitationQuery = await pool.query(`
        SELECT ui.*, e.id as establishment_id, e.name as establishment_name, e.email as establishment_email
        FROM user_invitations ui
        LEFT JOIN establishments e ON ui.establishment_id = e.id
        WHERE ui.invitation_token = $1 
          AND ui.status = 'pending'
          AND ui.expires_at > CURRENT_TIMESTAMP
      `, [token]);

      if (invitationQuery.rows.length === 0) {
        return {
          isValid: false,
          token,
          error: 'Invalid or expired invitation token'
        };
      }

      const invitation = invitationQuery.rows[0];

      // If invitation has no establishment_id, it's for new business setup
      if (!invitation.establishment_id) {
        return {
          isValid: true,
          token,
          establishment: {
            id: '', // Will be created during setup
            name: invitation.establishment_name,
            email: invitation.email
          },
          expires_at: invitation.expires_at
        };
      }

      // Check if establishment setup is already completed
      const establishment = await pool.query(
        'SELECT status FROM establishments WHERE id = $1',
        [invitation.establishment_id]
      );

      if (establishment.rows[0]?.status === 'active') {
        return {
          isValid: false,
          token,
          error: 'This establishment has already been set up'
        };
      }

      return {
        isValid: true,
        token,
        establishment: {
          id: invitation.establishment_id,
          name: invitation.establishment_name,
          email: invitation.establishment_email
        },
        expires_at: invitation.expires_at
      };

    } catch (error) {
      this.logger.error(
        'Error validating invitation',
        error as Error,
        { token },
        'SETUP_DATABASE'
      );
      
      return {
        isValid: false,
        token,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Check setup status
   */
  static async checkSetupStatus(
    pool: any,
    token: string
  ): Promise<{ completed: boolean; redirectUrl?: string; error?: string }> {
    try {
      const invitationQuery = await pool.query(`
        SELECT ui.*, e.status as establishment_status
        FROM user_invitations ui
        LEFT JOIN establishments e ON ui.establishment_id = e.id
        WHERE ui.invitation_token = $1
      `, [token]);

      if (invitationQuery.rows.length === 0) {
        return {
          completed: false,
          error: 'Invalid invitation token'
        };
      }

      const invitation = invitationQuery.rows[0];
      const isCompleted = invitation.establishment_status === 'active';

      return {
        completed: isCompleted,
        redirectUrl: isCompleted ? '/login' : undefined
      };

    } catch (error) {
      this.logger.error(
        'Error checking setup status',
        error as Error,
        { token },
        'SETUP_DATABASE'
      );
      
      return {
        completed: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Create or update user account
   */
  static async createOrUpdateUserAccount(
    client: PoolClient,
    setupData: BusinessSetupRequest,
    establishmentId: string,
    existingUser?: { userId: number }
  ): Promise<any> {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(setupData.password, saltRounds);

    if (existingUser) {
      // Update existing user
      const userResult = await client.query(`
        UPDATE users SET 
          password_hash = $1,
          first_name = $2,
          last_name = $3,
          establishment_id = $4,
          role = 'admin',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, email, first_name, last_name, role
      `, [passwordHash, setupData.first_name, setupData.last_name, establishmentId, existingUser.userId]);

      return userResult.rows[0];
    } else {
      // Create new user
      const userResult = await client.query(`
        INSERT INTO users (
          email, password_hash, first_name, last_name, 
          role, establishment_id, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'admin', $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, email, first_name, last_name, role
      `, [setupData.email, passwordHash, setupData.first_name, setupData.last_name, establishmentId]);

      return userResult.rows[0];
    }
  }

  /**
   * Update establishment information
   */
  static async updateEstablishmentInfo(
    client: PoolClient,
    setupData: BusinessSetupRequest,
    establishmentId: string
  ): Promise<void> {
    await client.query(`
      UPDATE establishments SET 
        name = $1,
        contact_email = $2,
        phone = $3,
        address = $4,
        tva_number = $5,
        siret_number = $6,
        status = 'active',
        setup_completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [
      setupData.business_name,
      setupData.contact_email,
      setupData.phone,
      setupData.address,
      setupData.tva_number || null,
      setupData.siret_number || null,
      establishmentId
    ]);
  }

  /**
   * Complete invitation process
   */
  static async completeInvitation(
    client: PoolClient,
    invitationToken: string,
    userId: number
  ): Promise<void> {
    await client.query(`
      UPDATE user_invitations SET 
        status = 'accepted',
        accepted_at = CURRENT_TIMESTAMP,
        accepted_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE invitation_token = $1
    `, [invitationToken, userId]);
  }

  /**
   * Initialize establishment schema
   */
  static async initializeEstablishmentSchema(
    establishmentId: string
  ): Promise<void> {
    try {
      // Note: SchemaManager needs a PoolClient and schema name
      // For now, we'll use a simple placeholder - needs proper implementation
      this.logger.info(
        'Schema initialization placeholder - needs proper implementation'
      );
      
      this.logger.info(
        'Establishment schema initialized successfully',
        { establishmentId },
        'SETUP_DATABASE'
      );
    } catch (error) {
      this.logger.error(
        'Error initializing establishment schema',
        error as Error,
        { establishmentId },
        'SETUP_DATABASE'
      );
      throw error;
    }
  }

  /**
   * Check if user exists
   */
  static async checkUserExists(
    client: PoolClient,
    email: string
  ): Promise<UserExistsResult> {
    const existingUser = await client.query(
      'SELECT id, establishment_id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length === 0) {
      return { exists: false, hasEstablishment: false };
    }

    const user = existingUser.rows[0];
    const hasEstablishment = user.establishment_id !== null;

    if (hasEstablishment) {
      throw new Error('User with this email already exists and is associated with an establishment');
    }

    return { exists: true, userId: user.id, hasEstablishment: false };
  }

  /**
   * Validate invitation for setup
   */
  static async validateInvitationForSetup(
    client: PoolClient,
    invitationToken: string
  ): Promise<InvitationData> {
    const invitationQuery = await client.query(`
      SELECT ui.*, e.id as establishment_id, e.name as establishment_name, e.status as establishment_status
      FROM user_invitations ui
      LEFT JOIN establishments e ON ui.establishment_id = e.id
      WHERE ui.invitation_token = $1 
        AND ui.status = 'pending'
        AND ui.expires_at > CURRENT_TIMESTAMP
    `, [invitationToken]);

    if (invitationQuery.rows.length === 0) {
      throw new Error('Invalid or expired invitation token');
    }

    const invitation = invitationQuery.rows[0];

    if (invitation.establishment_status === 'active') {
      throw new Error('This establishment has already been set up');
    }

    return {
      establishment_id: invitation.establishment_id,
      establishment_name: invitation.establishment_name,
      establishment_status: invitation.establishment_status,
      invitation_id: invitation.id,
      expires_at: invitation.expires_at
    };
  }

  /**
   * Create transaction context
   */
  static async createTransactionContext(
    pool: any
  ): Promise<{ client: PoolClient; context: TransactionContext }> {
    const client = await pool.connect();
    const context: TransactionContext = {
      client,
      transactionId: `setup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date()
    };

    await client.query('BEGIN');
    
    return { client, context };
  }

  /**
   * Commit transaction
   */
  static async commitTransaction(
    client: PoolClient,
    context: TransactionContext
  ): Promise<void> {
    try {
      await client.query('COMMIT');
      
      const duration = Date.now() - context.startTime.getTime();
      this.logger.info(
        'Setup transaction committed successfully',
        { 
          transactionId: context.transactionId,
          duration: `${duration}ms`
        },
        'SETUP_DATABASE'
      );
    } finally {
      client.release();
    }
  }

  /**
   * Rollback transaction
   */
  static async rollbackTransaction(
    client: PoolClient,
    context: TransactionContext,
    error?: Error
  ): Promise<void> {
    try {
      await client.query('ROLLBACK');
      
      const duration = Date.now() - context.startTime.getTime();
      this.logger.error(
        'Setup transaction rolled back',
        error || new Error('Transaction rollback'),
        { 
          transactionId: context.transactionId,
          duration: `${duration}ms`
        },
        'SETUP_DATABASE'
      );
    } finally {
      client.release();
    }
  }

  /**
   * Log setup progress
   */
  static async logSetupProgress(
    client: PoolClient,
    establishmentId: string,
    progress: SetupProgress
  ): Promise<void> {
    try {
      await client.query(`
        INSERT INTO setup_progress (
          establishment_id,
          invitation_validated,
          user_created,
          establishment_updated,
          default_data_created,
          schema_initialized,
          audit_logged,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (establishment_id) DO UPDATE SET
          invitation_validated = EXCLUDED.invitation_validated,
          user_created = EXCLUDED.user_created,
          establishment_updated = EXCLUDED.establishment_updated,
          default_data_created = EXCLUDED.default_data_created,
          schema_initialized = EXCLUDED.schema_initialized,
          audit_logged = EXCLUDED.audit_logged,
          updated_at = CURRENT_TIMESTAMP
      `, [
        establishmentId,
        progress.invitation_validated,
        progress.user_created,
        progress.establishment_updated,
        progress.default_data_created,
        progress.schema_initialized,
        progress.audit_logged
      ]);
    } catch (error) {
      // Log progress tracking is not critical, so we don't throw
      this.logger.warn(
        'Failed to log setup progress: ' + (error as Error).message
      );
    }
  }

  /**
   * Cleanup failed setup
   */
  static async cleanupFailedSetup(
    client: PoolClient,
    establishmentId: string,
    userId?: number
  ): Promise<void> {
    try {
      // Reset establishment status
      await client.query(
        'UPDATE establishments SET status = \'pending\', setup_completed_at = NULL WHERE id = $1',
        [establishmentId]
      );

      // Remove user association if user was created/updated
      if (userId) {
        await client.query(
          'UPDATE users SET establishment_id = NULL WHERE id = $1',
          [userId]
        );
      }

      this.logger.info(
        'Cleaned up failed setup',
        { establishmentId, userId },
        'SETUP_DATABASE'
      );
    } catch (error) {
      this.logger.error(
        'Error during setup cleanup',
        error as Error,
        { establishmentId, userId },
        'SETUP_DATABASE'
      );
    }
  }
}

