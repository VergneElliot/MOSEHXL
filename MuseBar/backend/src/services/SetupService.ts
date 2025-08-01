/**
 * Setup Service
 * Handles business setup wizard logic and operations
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PoolClient } from 'pg';
import { pool } from '../app';
import { AuditTrailModel } from '../models/auditTrail';
import { Logger } from '../utils/logger';

/**
 * Invitation validation interface
 */
export interface InvitationValidation {
  isValid: boolean;
  token: string;
  establishment?: {
    id: string;
    name: string;
    email: string;
  };
  expires_at?: Date;
  error?: string;
}

/**
 * Business setup request interface
 */
export interface BusinessSetupRequest {
  // User account information
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
  
  // Business information
  business_name: string;
  contact_email: string;
  phone: string;
  address: string;
  tva_number?: string;
  siret_number?: string;
  
  // Setup metadata
  invitation_token: string;
}

/**
 * Business setup response interface
 */
export interface BusinessSetupResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  establishment?: {
    id: string;
    name: string;
    status: string;
  };
  token?: string;
}

/**
 * Setup status interface
 */
export interface SetupStatus {
  completed: boolean;
  redirectUrl?: string;
  error?: string;
}

/**
 * Setup Service Class
 */
export class SetupService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Validate invitation token
   */
  public async validateInvitationToken(token: string): Promise<InvitationValidation> {
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
        JOIN establishments e ON ui.establishment_id = e.id
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
        'Error validating invitation token',
        error as Error,
        { token },
        'SETUP_SERVICE'
      );
      
      return {
        isValid: false,
        token,
        error: 'Internal server error during validation'
      };
    }
  }

  /**
   * Check setup completion status
   */
  public async checkSetupStatus(token: string): Promise<SetupStatus> {
    try {
      const invitationQuery = await pool.query(`
        SELECT ui.*, e.status as establishment_status
        FROM user_invitations ui
        JOIN establishments e ON ui.establishment_id = e.id
        WHERE ui.invitation_token = $1
      `, [token]);

      if (invitationQuery.rows.length === 0) {
        return {
          completed: false,
          error: 'Invitation not found'
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
        'SETUP_SERVICE'
      );
      
      return {
        completed: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Complete business setup
   */
  public async completeBusinessSetup(
    setupData: BusinessSetupRequest,
    ipAddress?: string,
    userAgent?: string
  ): Promise<BusinessSetupResponse> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate setup data
      this.validateSetupData(setupData);

      // Validate invitation token
      const invitation = await this.validateInvitationForSetup(client, setupData.invitation_token);

      // Check if user already exists
      await this.checkUserExists(client, setupData.email);

      // Create user account
      const newUser = await this.createUserAccount(client, setupData, invitation.establishment_id);

      // Update establishment information
      await this.updateEstablishmentInfo(client, setupData, invitation.establishment_id);

      // Mark invitation as completed
      await this.markInvitationCompleted(client, setupData.invitation_token);

      // Create user permissions
      await this.createUserPermissions(client, newUser.id);

      // Log the successful setup
      await AuditTrailModel.logAction({
        user_id: String(newUser.id),
        action_type: 'COMPLETE_SETUP',
        resource_type: 'ESTABLISHMENT',
        resource_id: invitation.establishment_id,
        action_details: {
          establishment_name: setupData.business_name,
          user_email: setupData.email,
          setup_completed: true
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      await client.query('COMMIT');

      // Generate JWT token for immediate login
      const token = this.generateJWTToken(newUser, invitation.establishment_id);

      this.logger.info(
        'Business setup completed successfully',
        {
          userId: newUser.id,
          establishmentId: invitation.establishment_id,
          businessName: setupData.business_name
        },
        'SETUP_SERVICE'
      );

      return {
        success: true,
        message: 'Business setup completed successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          role: newUser.role
        },
        establishment: {
          id: invitation.establishment_id,
          name: setupData.business_name,
          status: 'active'
        },
        token
      };

    } catch (error) {
      await client.query('ROLLBACK');
      
      this.logger.error(
        'Error completing business setup',
        error as Error,
        { setupData: { ...setupData, password: '[REDACTED]' } },
        'SETUP_SERVICE'
      );
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to complete setup. Please try again.'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Validate setup data
   */
  private validateSetupData(setupData: BusinessSetupRequest): void {
    if (!setupData.first_name || !setupData.last_name || !setupData.email || 
        !setupData.password || !setupData.business_name || !setupData.contact_email || 
        !setupData.phone || !setupData.address || !setupData.invitation_token) {
      throw new Error('Missing required fields');
    }

    if (setupData.password !== setupData.confirm_password) {
      throw new Error('Passwords do not match');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(setupData.email) || !emailRegex.test(setupData.contact_email)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Validate invitation token for setup
   */
  private async validateInvitationForSetup(client: PoolClient, invitationToken: string): Promise<{
    establishment_id: string;
    establishment_name: string;
  }> {
    const invitationQuery = await client.query(`
      SELECT ui.*, e.id as establishment_id, e.name as establishment_name
      FROM user_invitations ui
      JOIN establishments e ON ui.establishment_id = e.id
      WHERE ui.invitation_token = $1 
        AND ui.status = 'pending'
        AND ui.expires_at > CURRENT_TIMESTAMP
    `, [invitationToken]);

    if (invitationQuery.rows.length === 0) {
      throw new Error('Invalid or expired invitation token');
    }

    return invitationQuery.rows[0];
  }

  /**
   * Check if user already exists
   */
  private async checkUserExists(client: PoolClient, email: string): Promise<void> {
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User with this email already exists');
    }
  }

  /**
   * Create user account
   */
  private async createUserAccount(
    client: PoolClient, 
    setupData: BusinessSetupRequest, 
    establishmentId: string
  ): Promise<any> {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(setupData.password, saltRounds);

    const userResult = await client.query(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, role, 
        establishment_id, is_admin, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING id, email, first_name, last_name, role
    `, [
      setupData.email,
      passwordHash,
      setupData.first_name,
      setupData.last_name,
      'establishment_admin',
      establishmentId,
      false
    ]);

    return userResult.rows[0];
  }

  /**
   * Update establishment information
   */
  private async updateEstablishmentInfo(
    client: PoolClient, 
    setupData: BusinessSetupRequest, 
    establishmentId: string
  ): Promise<void> {
    await client.query(`
      UPDATE establishments SET 
        name = $1,
        email = $2,
        phone = $3,
        address = $4,
        tva_number = $5,
        siret_number = $6,
        status = 'active',
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
   * Mark invitation as completed
   */
  private async markInvitationCompleted(client: PoolClient, invitationToken: string): Promise<void> {
    await client.query(`
      UPDATE user_invitations SET 
        status = 'accepted',
        accepted_at = CURRENT_TIMESTAMP
      WHERE invitation_token = $1
    `, [invitationToken]);
  }

  /**
   * Create user permissions (full access for establishment admin)
   */
  private async createUserPermissions(client: PoolClient, userId: number): Promise<void> {
    const permissions = [
      'manage_users', 'manage_products', 'manage_categories', 'manage_orders',
      'view_reports', 'manage_settings', 'manage_happy_hour', 'process_payments',
      'view_audit_logs', 'manage_establishment'
    ];

    for (const permission of permissions) {
      await client.query(`
        INSERT INTO user_permissions (user_id, permission, granted_by, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `, [userId, permission, userId]);
    }
  }

  /**
   * Generate JWT token for immediate login
   */
  private generateJWTToken(user: any, establishmentId: string): string {
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        establishment_id: establishmentId
      },
      jwtSecret,
      { expiresIn: '7d' }
    );
  }
}