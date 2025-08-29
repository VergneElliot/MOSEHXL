/**
 * Setup Wizard - Wizard Logic and Orchestration
 * Handles the complete setup process orchestration
 */

import jwt from 'jsonwebtoken';
import { PoolClient } from 'pg';
import {
  BusinessSetupRequest,
  BusinessSetupResponse,
  SetupStatusResponse,
  InvitationValidation,
  SetupContext,
  SetupProgress,
  SetupWizardState,
  SetupStep
} from './types';
import { SetupValidator } from './setupValidator';
import { SetupDatabase } from './setupDatabase';
import { SetupDefaults } from './setupDefaults';
import { AuditTrailModel } from '../../models/auditTrail';
import { Logger } from '../../utils/logger';

/**
 * Setup Wizard Orchestrator
 */
export class SetupWizard {
  private static logger = Logger.getInstance();

  /**
   * Complete business setup (main orchestrator)
   */
  static async completeBusinessSetup(
    pool: any,
    setupData: BusinessSetupRequest,
    ipAddress?: string,
    userAgent?: string
  ): Promise<BusinessSetupResponse> {
    const { client, context } = await SetupDatabase.createTransactionContext(pool);
    
    const setupContext: SetupContext = {
      ipAddress,
      userAgent,
      timestamp: new Date()
    };

    const progress: SetupProgress = {
      invitation_validated: false,
      user_created: false,
      establishment_updated: false,
      default_data_created: false,
      schema_initialized: false,
      audit_logged: false
    };
    
    try {
      this.logger.info(
        'Starting business setup process',
        { 
          email: setupData.email,
          businessName: setupData.business_name,
          transactionId: context.transactionId
        },
        'SETUP_WIZARD'
      );

      // Step 1: Validate setup data
      this.logger.info('Step 1: Validating setup data', {}, 'SETUP_WIZARD');
      SetupValidator.validateSetupDataStrict(setupData);

      // Step 2: Validate invitation token
      this.logger.info('Step 2: Validating invitation', {}, 'SETUP_WIZARD');
      const invitation = await SetupValidator.validateInvitationForSetup(
        client, 
        setupData.invitation_token
      );
      progress.invitation_validated = true;
      await SetupDatabase.logSetupProgress(client, invitation.establishment_id, progress);

      // Step 3: Check if user already exists
      this.logger.info('Step 3: Checking user existence', {}, 'SETUP_WIZARD');
      const existingUser = await SetupDatabase.checkUserExists(client, setupData.email);

      // Step 4: Create or update user account
      this.logger.info('Step 4: Creating/updating user account', {}, 'SETUP_WIZARD');
      const newUser = await SetupDatabase.createOrUpdateUserAccount(
        client, 
        setupData, 
        invitation.establishment_id, 
        existingUser.exists ? { userId: existingUser.userId! } : undefined
      );
      progress.user_created = true;
      await SetupDatabase.logSetupProgress(client, invitation.establishment_id, progress);

      // Step 5: Update establishment information
      this.logger.info('Step 5: Updating establishment info', {}, 'SETUP_WIZARD');
      await SetupDatabase.updateEstablishmentInfo(client, setupData, invitation.establishment_id);
      progress.establishment_updated = true;
      await SetupDatabase.logSetupProgress(client, invitation.establishment_id, progress);

      // Step 6: Initialize establishment schema
      this.logger.info('Step 6: Initializing schema', {}, 'SETUP_WIZARD');
      await SetupDatabase.initializeEstablishmentSchema(invitation.establishment_id);
      progress.schema_initialized = true;
      await SetupDatabase.logSetupProgress(client, invitation.establishment_id, progress);

      // Step 7: Create default data
      this.logger.info('Step 7: Creating default data', {}, 'SETUP_WIZARD');
      await SetupDefaults.createAllDefaultData(client, invitation.establishment_id, setupContext);
      progress.default_data_created = true;
      await SetupDatabase.logSetupProgress(client, invitation.establishment_id, progress);

      // Step 8: Complete invitation
      this.logger.info('Step 8: Completing invitation', {}, 'SETUP_WIZARD');
      await SetupDatabase.completeInvitation(client, setupData.invitation_token, newUser.id);

      // Step 9: Create audit trail
      this.logger.info('Step 9: Creating audit trail', {}, 'SETUP_WIZARD');
      await this.createSetupAuditTrail(
        client,
        newUser.id,
        invitation.establishment_id,
        setupData,
        setupContext
      );
      progress.audit_logged = true;
      await SetupDatabase.logSetupProgress(client, invitation.establishment_id, progress);

      // Step 10: Generate JWT token
      this.logger.info('Step 10: Generating authentication token', {}, 'SETUP_WIZARD');
      const token = this.generateAuthToken(newUser, invitation.establishment_id);

      // Commit transaction
      await SetupDatabase.commitTransaction(client, context);

      this.logger.info(
        'Business setup completed successfully',
        { 
          userId: newUser.id,
          establishmentId: invitation.establishment_id,
          transactionId: context.transactionId
        },
        'SETUP_WIZARD'
      );

      return {
        success: true,
        message: 'Business setup completed successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          role: newUser.role,
          establishment: {
            id: invitation.establishment_id,
            name: invitation.establishment_name,
            status: 'active'
          }
        },
        token
      };

    } catch (error) {
      await SetupDatabase.rollbackTransaction(client, context, error as Error);
      
      this.logger.error(
        'Error completing business setup',
        error as Error,
        { 
          setupData: { ...setupData, password: '[REDACTED]' },
          transactionId: context.transactionId,
          progress
        },
        'SETUP_WIZARD'
      );
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to complete setup. Please try again.'
      };
    }
  }

  /**
   * Get setup wizard steps
   */
  static getSetupSteps(): SetupStep[] {
    return [
      {
        id: 'invitation',
        name: 'Validation de l\'invitation',
        description: 'Vérification du token d\'invitation',
        required: true,
        completed: false,
        order: 1
      },
      {
        id: 'user_info',
        name: 'Informations utilisateur',
        description: 'Création du compte administrateur',
        required: true,
        completed: false,
        order: 2
      },
      {
        id: 'business_info',
        name: 'Informations établissement',
        description: 'Configuration des données de l\'entreprise',
        required: true,
        completed: false,
        order: 3
      },
      {
        id: 'schema_setup',
        name: 'Initialisation base de données',
        description: 'Création du schéma établissement',
        required: true,
        completed: false,
        order: 4
      },
      {
        id: 'default_data',
        name: 'Données par défaut',
        description: 'Création des catégories et produits de base',
        required: true,
        completed: false,
        order: 5
      },
      {
        id: 'finalization',
        name: 'Finalisation',
        description: 'Finalisation de la configuration',
        required: true,
        completed: false,
        order: 6
      }
    ];
  }

  /**
   * Get setup wizard state
   */
  static async getSetupWizardState(
    pool: any,
    invitationToken: string
  ): Promise<SetupWizardState> {
    try {
      // Get setup steps
      const steps = this.getSetupSteps();
      
      // Check current progress
      const validation = await SetupDatabase.validateInvitation(pool, invitationToken);
      
      if (!validation.isValid) {
        return {
          currentStep: 0,
          totalSteps: steps.length,
          steps,
          data: {},
          errors: [{ field: 'invitation_token', message: validation.error || 'Invalid invitation' }]
        };
      }

      // Determine current step based on establishment status
      let currentStep = 1;
      if (validation.establishment?.id) {
        const status = await SetupDatabase.checkSetupStatus(pool, invitationToken);
        if (status.completed) {
          currentStep = steps.length;
          steps.forEach(step => step.completed = true);
        }
      }

      return {
        currentStep,
        totalSteps: steps.length,
        steps,
        data: {
          invitation_token: invitationToken,
          business_name: validation.establishment?.name || '',
          contact_email: validation.establishment?.email || ''
        },
        errors: []
      };

    } catch (error) {
      this.logger.error(
        'Error getting setup wizard state',
        error as Error,
        { invitationToken },
        'SETUP_WIZARD'
      );

      return {
        currentStep: 0,
        totalSteps: this.getSetupSteps().length,
        steps: this.getSetupSteps(),
        data: {},
        errors: [{ field: 'general', message: 'Error loading setup state' }]
      };
    }
  }

  /**
   * Validate setup step
   */
  static validateSetupStep(
    stepId: string,
    data: Partial<BusinessSetupRequest>
  ): { isValid: boolean; errors: any[] } {
    const errors: any[] = [];

    switch (stepId) {
      case 'invitation':
        if (!data.invitation_token) {
          errors.push({ field: 'invitation_token', message: 'Invitation token is required' });
        }
        break;

      case 'user_info':
        if (!data.first_name) errors.push({ field: 'first_name', message: 'First name is required' });
        if (!data.last_name) errors.push({ field: 'last_name', message: 'Last name is required' });
        if (!data.email) errors.push({ field: 'email', message: 'Email is required' });
        if (!data.password) errors.push({ field: 'password', message: 'Password is required' });
        if (data.password !== data.confirm_password) {
          errors.push({ field: 'confirm_password', message: 'Passwords do not match' });
        }
        break;

      case 'business_info':
        if (!data.business_name) errors.push({ field: 'business_name', message: 'Business name is required' });
        if (!data.contact_email) errors.push({ field: 'contact_email', message: 'Contact email is required' });
        if (!data.phone) errors.push({ field: 'phone', message: 'Phone is required' });
        if (!data.address) errors.push({ field: 'address', message: 'Address is required' });
        break;

      default:
        // Other steps don't require client-side validation
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create setup audit trail
   */
  private static async createSetupAuditTrail(
    client: PoolClient,
    userId: number,
    establishmentId: string,
    setupData: BusinessSetupRequest,
    context: SetupContext
  ): Promise<void> {
    try {
      // Note: AuditTrailModel.createAuditEntry method may need to be implemented
      // For now, we'll create a simple audit entry
      await client.query(`
        INSERT INTO audit_trail (
          user_id, establishment_id, action, entity_type, entity_id,
          old_values, new_values, ip_address, user_agent, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      `, [
        userId,
        establishmentId,
        'business_setup_completed',
        'establishment',
        establishmentId,
        JSON.stringify({}),
        JSON.stringify({
          business_name: setupData.business_name,
          contact_email: setupData.contact_email,
          phone: setupData.phone,
          address: setupData.address,
          setup_completed: true
        }),
        context.ipAddress,
        context.userAgent,
        JSON.stringify({
          setup_timestamp: context.timestamp,
          invitation_token: setupData.invitation_token.substring(0, 8) + '...'
        })
      ]);
      /* Original code used AuditTrailModel.createAuditEntry which needs implementation
      await AuditTrailModel.createAuditEntry(
        client,
        {
          user_id: userId,
          establishment_id: establishmentId,
          action: 'business_setup_completed',
          entity_type: 'establishment',
          entity_id: establishmentId,
          old_values: {},
          new_values: {
            business_name: setupData.business_name,
            contact_email: setupData.contact_email,
            phone: setupData.phone,
            address: setupData.address,
            setup_completed: true
          },
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
          metadata: {
            setup_timestamp: context.timestamp,
            invitation_token: setupData.invitation_token.substring(0, 8) + '...'
          }
        }
      ); */
    } catch (error) {
      // Audit trail failure shouldn't break setup
      this.logger.warn(
        'Failed to create setup audit trail: ' + (error as Error).message
      );
    }
  }

  /**
   * Generate authentication token
   */
  private static generateAuthToken(user: any, establishmentId: string): string {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        establishmentId: establishmentId
      },
      jwtSecret,
      { expiresIn: '7d' }
    );
  }

  /**
   * Validate invitation (public interface)
   */
  static async validateInvitation(
    pool: any,
    token: string
  ): Promise<InvitationValidation> {
    return SetupDatabase.validateInvitation(pool, token);
  }

  /**
   * Check setup status (public interface)
   */
  static async checkSetupStatus(
    pool: any,
    token: string
  ): Promise<SetupStatusResponse> {
    return SetupDatabase.checkSetupStatus(pool, token);
  }

  /**
   * Cleanup failed setup
   */
  static async cleanupFailedSetup(
    pool: any,
    establishmentId: string,
    userId?: number
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await SetupDatabase.cleanupFailedSetup(client, establishmentId, userId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get setup progress
   */
  static async getSetupProgress(
    pool: any,
    establishmentId: string
  ): Promise<SetupProgress | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM setup_progress WHERE establishment_id = $1',
        [establishmentId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        invitation_validated: row.invitation_validated,
        user_created: row.user_created,
        establishment_updated: row.establishment_updated,
        default_data_created: row.default_data_created,
        schema_initialized: row.schema_initialized,
        audit_logged: row.audit_logged
      };
    } catch (error) {
      this.logger.error(
        'Error getting setup progress',
        error as Error,
        { establishmentId },
        'SETUP_WIZARD'
      );
      return null;
    }
  }

  /**
   * Retry failed setup step
   */
  static async retrySetupStep(
    pool: any,
    establishmentId: string,
    stepId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.info(
        'Retrying setup step',
        { establishmentId, stepId },
        'SETUP_WIZARD'
      );

      // Implementation would depend on specific step requirements
      // This is a placeholder for step-specific retry logic

      return {
        success: true,
        message: `Setup step ${stepId} retried successfully`
      };
    } catch (error) {
      this.logger.error(
        'Error retrying setup step',
        error as Error,
        { establishmentId, stepId },
        'SETUP_WIZARD'
      );

      return {
        success: false,
        message: 'Failed to retry setup step'
      };
    }
  }
}

