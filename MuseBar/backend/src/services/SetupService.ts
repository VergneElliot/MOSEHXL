/**
 * Setup Service
 * Handles business setup wizard logic and operations
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PoolClient } from 'pg';
import { pool } from '../app';
import { AuditTrailModel } from '../models/auditTrail';
import { Logger } from '../utils/logger';
import { SchemaManager } from '../services/SchemaManager';
import crypto from 'crypto';

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

      // Check if user already exists and can proceed with setup
      const existingUser = await this.checkUserExists(client, setupData.email);

      // Create or update user account
      const newUser = await this.createOrUpdateUserAccount(client, setupData, invitation.establishment_id, existingUser.exists ? { userId: existingUser.userId! } : undefined);

      // Update establishment information
      await this.updateEstablishmentInfo(client, setupData, invitation.establishment_id);

      // Mark invitation as completed
      await this.markInvitationCompleted(client, setupData.invitation_token);

      // Create user permissions
      await this.createUserPermissions(client, newUser.id, existingUser.exists);

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
    // First, try to find invitation with existing establishment
    let invitationQuery = await client.query(`
      SELECT ui.*, e.id as establishment_id, e.name as establishment_name
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

    // If invitation has no establishment_id, create a new establishment
    if (!invitation.establishment_id) {
      // Create new establishment for this invitation
      const establishmentId = crypto.randomUUID();
      const schemaName = `establishment_${crypto.randomUUID().replace(/-/g, '_')}`;
      
      await client.query(`
        INSERT INTO establishments (
          id, name, email, schema_name, subscription_plan, subscription_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, [
        establishmentId,
        invitation.establishment_name,
        invitation.email,
        schemaName,
        'basic',
        'active'
      ]);

      // Update invitation with establishment_id
      await client.query(`
        UPDATE user_invitations 
        SET establishment_id = $1 
        WHERE invitation_token = $2
      `, [establishmentId, invitationToken]);

      // Create establishment schema
      await SchemaManager.createEstablishmentSchema(client, schemaName);

      return {
        establishment_id: establishmentId,
        establishment_name: invitation.establishment_name
      };
    }

    return {
      establishment_id: invitation.establishment_id,
      establishment_name: invitation.establishment_name
    };
  }

  /**
   * Check if user already exists and can proceed with setup
   */
  private async checkUserExists(client: PoolClient, email: string): Promise<{ exists: boolean; userId?: number; hasEstablishment: boolean }> {
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
   * Create or update user account
   */
  private async createOrUpdateUserAccount(
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
          role = $4,
          establishment_id = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING id, email, first_name, last_name, role
      `, [
        passwordHash,
        setupData.first_name,
        setupData.last_name,
        'establishment_admin',
        establishmentId,
        existingUser.userId
      ]);

      return userResult.rows[0];
    } else {
      // Create new user
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
  private async createUserPermissions(client: PoolClient, userId: number, isExistingUser: boolean = false): Promise<void> {
    // Clear existing permissions if updating an existing user
    if (isExistingUser) {
      await client.query('DELETE FROM user_permissions WHERE user_id = $1', [userId]);
    }

    // Get all permission IDs for full access
    const permissionsResult = await client.query('SELECT id FROM permissions');
    const permissionIds = permissionsResult.rows.map(row => row.id);

    for (const permissionId of permissionIds) {
      await client.query(`
        INSERT INTO user_permissions (user_id, permission_id)
        VALUES ($1, $2)
      `, [userId, permissionId]);
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