/**
 * Setup Wizard
 * Main orchestrator for the complete setup process
 */

import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';
import { 
  BusinessSetupRequest, 
  BusinessSetupResponse, 
  SetupStatusResponse, 
  InvitationValidation, 
  SetupContext, 
  SetupProgress,
  SetupWizardState,
  SetupStep
} from '../types';
import { SetupDatabase } from '../setupDatabase';
import { SetupProgressTracker } from './SetupProgressTracker';
import { SetupStepProcessor } from './SetupStepProcessor';
import { SetupAuthManager } from './SetupAuthManager';
import { SetupAuditManager } from './SetupAuditManager';
import { getSetupSteps } from './steps';
import { SetupExecutionMetrics } from './types';

/**
 * Setup Wizard Orchestrator
 */
export class SetupWizard {
  private static logger = Logger.getInstance();

  /**
   * Complete business setup (main orchestrator)
   */
  public static async completeBusinessSetup(
    pool: any,
    setupData: BusinessSetupRequest,
    ipAddress?: string,
    userAgent?: string
  ): Promise<BusinessSetupResponse> {
    const context = await SetupDatabase.createTransactionContext(pool);
    const { client } = context;
    
          const setupContext: SetupContext = {
        ipAddress,
        userAgent,
        timestamp: new Date()
      };

      const progressTracker = new SetupProgressTracker();
      const progress = SetupProgressTracker.createEmptyProgress();
      
      let invitation: any = null;
      let newUser: any = null;
      
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

        // Define setup steps in order
        const setupSteps = [
          'validate_data',
          'validate_invitation', 
          'create_user',
          'update_establishment',
          'initialize_schema',
          'create_defaults',
          'complete_invitation',
          'create_audit'
        ];

      // Execute each step
      for (const stepId of setupSteps) {
        progressTracker.startStep(stepId);
        
        this.logger.info(`Executing step: ${stepId}`, {}, 'SETUP_WIZARD');
        
        const stepResult = await SetupStepProcessor.executeStep(
          stepId,
          client,
          setupData,
          setupContext,
          progress,
          { maxAttempts: 2, delayMs: 1000, exponentialBackoff: true }
        );

        progressTracker.completeStep(stepId, stepResult);

        if (!stepResult.success) {
          throw stepResult.error || new Error(`Step ${stepId} failed`);
        }

        // Update progress based on completed step
        await this.updateProgressForStep(stepId, progress, client, setupData);
        
        // Store data from specific steps
        if (stepId === 'validate_invitation') {
          invitation = stepResult.data;
        } else if (stepId === 'create_user') {
          newUser = stepResult.data;
        }
      }

      // Generate authentication token
      this.logger.info('Generating authentication token', {}, 'SETUP_WIZARD');
      const token = SetupAuthManager.generateAuthToken(newUser, invitation.establishment_id);

      // Commit transaction
      await SetupDatabase.commitTransaction(client, context);

      const metrics = progressTracker.getMetrics();
      this.logger.info(
        'Business setup completed successfully',
        { 
          userId: newUser.id,
          establishmentId: invitation.establishment_id,
          transactionId: context.transactionId,
          duration: metrics.totalDuration,
          retryCount: metrics.retryCount
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
      const metrics = progressTracker.getMetrics();
      
      // Create failure audit entry
      if (invitation) {
        await SetupAuditManager.createFailureAuditEntry(
          client,
          newUser?.id || null,
          invitation.establishment_id,
          error as Error,
          undefined,
          setupContext
        );
      }

      await SetupDatabase.rollbackTransaction(client, context, error as Error);
      
      this.logger.error(
        'Error completing business setup',
        error as Error,
        'SETUP_WIZARD'
      );
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to complete setup. Please try again.'
      };
    }
  }

  /**
   * Update progress for a completed step
   */
  private static async updateProgressForStep(
    stepId: string,
    progress: SetupProgress,
    client: PoolClient,
    setupData: BusinessSetupRequest
  ): Promise<void> {
    switch (stepId) {
      case 'validate_data':
      case 'validate_invitation':
        progress.invitation_validated = true;
        break;
      case 'create_user':
        progress.user_created = true;
        break;
      case 'update_establishment':
        progress.establishment_updated = true;
        break;
      case 'initialize_schema':
        progress.schema_initialized = true;
        break;
      case 'create_defaults':
        progress.default_data_created = true;
        break;
      case 'create_audit':
        progress.audit_logged = true;
        break;
    }

    // Get establishment ID for logging progress
    const invitation = await SetupDatabase.validateInvitation(client as any, setupData.invitation_token);
    if (invitation.isValid && invitation.establishment?.id) {
      await SetupProgressTracker.logSetupProgress(
        client, 
        invitation.establishment.id, 
        progress
      );
    }
  }

  /**
   * Get setup wizard steps
   */
  public static getSetupSteps(): SetupStep[] {
    return getSetupSteps();
  }

  /**
   * Get setup wizard state
   */
  public static async getSetupWizardState(
    pool: any,
    invitationToken: string
  ): Promise<SetupWizardState> {
    try {
      const steps = this.getSetupSteps();
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

      let currentStep = 1;
      if (validation.establishment?.id) {
        const status = await SetupDatabase.checkSetupStatus(pool, invitationToken);
        // Transform the status to check if setup is completed
        const isCompleted = status.success && status.data?.establishment?.status === 'active';
        if (isCompleted) {
          currentStep = steps.length;
          // Mark all steps as completed
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
  public static validateSetupStep(stepId: string, data: Partial<BusinessSetupRequest>) {
    // Basic validation - can be enhanced later
    const errors: any[] = [];
    
    if (!data.email || !data.password || !data.business_name) {
      errors.push('Missing required fields');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate invitation (public interface)
   */
  public static async validateInvitation(
    pool: any,
    token: string
  ): Promise<InvitationValidation> {
    return SetupDatabase.validateInvitation(pool, token);
  }

  /**
   * Check setup status (public interface)
   */
  public static async checkSetupStatus(
    pool: any,
    token: string
  ): Promise<SetupStatusResponse> {
    const result = await SetupDatabase.checkSetupStatus(pool, token);
    
    // Transform the result to match SetupStatusResponse
    if (result.success && result.data) {
      return {
        completed: result.data.establishment?.status === 'active',
        redirectUrl: undefined
      };
    } else {
      return {
        completed: false,
        error: result.error || 'Setup status check failed'
      };
    }
  }

  /**
   * Cleanup failed setup
   */
  public static async cleanupFailedSetup(
    pool: any,
    establishmentId: string,
    userId?: number
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await SetupDatabase.cleanupFailedSetup(client, establishmentId, userId);
      
      // Create cleanup audit entry
      await SetupAuditManager.createCleanupAuditEntry(
        client,
        establishmentId,
        ['user_cleanup', 'establishment_cleanup', 'data_cleanup'],
        userId
      );
      
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
  public static async getSetupProgress(
    pool: any,
    establishmentId: string
  ): Promise<SetupProgress | null> {
    return SetupProgressTracker.getSetupProgress(pool, establishmentId);
  }

  /**
   * Retry failed setup step
   */
  public static async retrySetupStep(
    pool: any,
    establishmentId: string,
    stepId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.info(
        'Retrying setup step',
        undefined,
        'SETUP_WIZARD'
      );

      // Reset progress from the failed step
      const client = await pool.connect();
      try {
        await SetupProgressTracker.resetProgress(client, establishmentId, stepId);
      } finally {
        client.release();
      }

      return {
        success: true,
        message: `Setup step ${stepId} retried successfully`
      };
    } catch (error) {
      this.logger.error(
        'Error retrying setup step',
        error as Error,
        'SETUP_WIZARD'
      );

      return {
        success: false,
        message: 'Failed to retry setup step'
      };
    }
  }
}
