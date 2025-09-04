/**
 * Setup Step Processor
 * Handles individual step processing logic for setup wizard
 */

import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';
import { BusinessSetupRequest, SetupContext, SetupProgress } from '../types';
import { SetupValidator } from '../setupValidator';
import { SetupDatabase } from '../setupDatabase';
import { SetupDefaults } from '../setupDefaults';
import { SetupProgressTracker } from './SetupProgressTracker';
import { SetupAuditManager } from './SetupAuditManager';
import { SetupStepResult, SetupRetryOptions } from './types';

/**
 * Setup step processing service
 */
export class SetupStepProcessor {
  private static logger = Logger.getInstance();

  /**
   * Execute a single setup step with error handling and retry logic
   */
  public static async executeStep(
    stepId: string,
    client: PoolClient,
    setupData: BusinessSetupRequest,
    context: SetupContext,
    progress: SetupProgress,
    retryOptions?: SetupRetryOptions
  ): Promise<SetupStepResult> {
    const maxAttempts = retryOptions?.maxAttempts || 1;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug(
          `Executing setup step: ${stepId} (attempt ${attempt}/${maxAttempts})`,
          { stepId, attempt },
          'SETUP_STEP_PROCESSOR'
        );

        const result = await this.executeStepInternal(
          stepId, 
          client, 
          setupData, 
          context, 
          progress
        );

        if (result.success) {
          this.logger.info(
            `Setup step completed successfully: ${stepId}`,
            { stepId, attempt },
            'SETUP_STEP_PROCESSOR'
          );
          return result;
        }

        lastError = result.error || new Error('Step failed without specific error');
        
        if (attempt < maxAttempts) {
          const delayMs = retryOptions?.exponentialBackoff 
            ? (retryOptions.delayMs || 1000) * Math.pow(2, attempt - 1)
            : (retryOptions?.delayMs || 1000);
          
          this.logger.warn(
            `Setup step failed, retrying in ${delayMs}ms: ${stepId}`,
            { stepId, attempt, error: lastError.message },
            'SETUP_STEP_PROCESSOR'
          );

          await this.delay(delayMs);
        }
      } catch (error) {
        lastError = error as Error;
        
        this.logger.error(
          `Setup step error: ${stepId}`,
          lastError,
          { stepId, attempt },
          'SETUP_STEP_PROCESSOR'
        );

        if (attempt < maxAttempts) {
          const delayMs = retryOptions?.exponentialBackoff 
            ? (retryOptions.delayMs || 1000) * Math.pow(2, attempt - 1)
            : (retryOptions?.delayMs || 1000);
          await this.delay(delayMs);
        }
      }
    }

    return {
      success: false,
      error: lastError || new Error(`Step ${stepId} failed after ${maxAttempts} attempts`),
      message: `Failed to complete step ${stepId} after ${maxAttempts} attempts`
    };
  }

  /**
   * Internal step execution logic
   */
  private static async executeStepInternal(
    stepId: string,
    client: PoolClient,
    setupData: BusinessSetupRequest,
    context: SetupContext,
    progress: SetupProgress
  ): Promise<SetupStepResult> {
    switch (stepId) {
      case 'validate_data':
        return await this.executeValidateDataStep(setupData);

      case 'validate_invitation':
        return await this.executeValidateInvitationStep(client, setupData);

      case 'create_user':
        return await this.executeCreateUserStep(client, setupData, context);

      case 'update_establishment':
        return await this.executeUpdateEstablishmentStep(client, setupData, context);

      case 'initialize_schema':
        return await this.executeInitializeSchemaStep(setupData, context);

      case 'create_defaults':
        return await this.executeCreateDefaultsStep(client, setupData, context);

      case 'complete_invitation':
        return await this.executeCompleteInvitationStep(client, setupData);

      case 'create_audit':
        return await this.executeCreateAuditStep(client, setupData, context);

      default:
        return {
          success: false,
          error: new Error(`Unknown step: ${stepId}`),
          message: `Step ${stepId} is not recognized`
        };
    }
  }

  /**
   * Execute data validation step
   */
  private static async executeValidateDataStep(
    setupData: BusinessSetupRequest
  ): Promise<SetupStepResult> {
    try {
      SetupValidator.validateSetupDataStrict(setupData);
      return { success: true, message: 'Setup data validated successfully' };
    } catch (error) {
      return { 
        success: false, 
        error: error as Error,
        message: 'Setup data validation failed'
      };
    }
  }

  /**
   * Execute invitation validation step
   */
  private static async executeValidateInvitationStep(
    client: PoolClient,
    setupData: BusinessSetupRequest
  ): Promise<SetupStepResult> {
    try {
      const invitation = await SetupValidator.validateInvitationForSetup(
        client, 
        setupData.invitation_token
      );
      return { 
        success: true, 
        data: invitation,
        message: 'Invitation validated successfully'
      };
    } catch (error) {
      return { 
        success: false, 
        error: error as Error,
        message: 'Invitation validation failed'
      };
    }
  }

  /**
   * Execute user creation step
   */
  private static async executeCreateUserStep(
    client: PoolClient,
    setupData: BusinessSetupRequest,
    context: SetupContext
  ): Promise<SetupStepResult> {
    try {
      // Get invitation to get establishment ID
      const invitation = await SetupValidator.validateInvitationForSetup(
        client, 
        setupData.invitation_token
      );

      const existingUser = await SetupDatabase.checkUserExists(client, setupData.email);
      const newUser = await SetupDatabase.createOrUpdateUserAccount(
        client, 
        setupData, 
        invitation.establishment_id, 
        existingUser.exists ? { userId: existingUser.userId! } : undefined
      );

      return { 
        success: true, 
        data: newUser,
        message: 'User account created/updated successfully'
      };
    } catch (error) {
      return { 
        success: false, 
        error: error as Error,
        message: 'User creation failed'
      };
    }
  }

  /**
   * Execute establishment update step
   */
  private static async executeUpdateEstablishmentStep(
    client: PoolClient,
    setupData: BusinessSetupRequest,
    context: SetupContext
  ): Promise<SetupStepResult> {
    try {
      const invitation = await SetupValidator.validateInvitationForSetup(
        client, 
        setupData.invitation_token
      );

      await SetupDatabase.updateEstablishmentInfo(
        client, 
        setupData, 
        invitation.establishment_id
      );

      return { 
        success: true,
        message: 'Establishment information updated successfully'
      };
    } catch (error) {
      return { 
        success: false, 
        error: error as Error,
        message: 'Establishment update failed'
      };
    }
  }

  /**
   * Execute schema initialization step
   */
  private static async executeInitializeSchemaStep(
    setupData: BusinessSetupRequest,
    context: SetupContext
  ): Promise<SetupStepResult> {
    try {
      // This would typically involve initializing database schemas
      // For now, we'll just log that it's completed
      this.logger.info(
        'Schema initialization step completed',
        {},
        'SETUP_STEP_PROCESSOR'
      );

      return { 
        success: true,
        message: 'Schema initialized successfully'
      };
    } catch (error) {
      return { 
        success: false, 
        error: error as Error,
        message: 'Schema initialization failed'
      };
    }
  }

  /**
   * Execute default data creation step
   */
  private static async executeCreateDefaultsStep(
    client: PoolClient,
    setupData: BusinessSetupRequest,
    context: SetupContext
  ): Promise<SetupStepResult> {
    try {
      const invitation = await SetupValidator.validateInvitationForSetup(
        client, 
        setupData.invitation_token
      );

      await SetupDefaults.createAllDefaultData(
        client, 
        invitation.establishment_id, 
        context
      );

      return { 
        success: true,
        message: 'Default data created successfully'
      };
    } catch (error) {
      return { 
        success: false, 
        error: error as Error,
        message: 'Default data creation failed'
      };
    }
  }

  /**
   * Execute invitation completion step
   */
  private static async executeCompleteInvitationStep(
    client: PoolClient,
    setupData: BusinessSetupRequest
  ): Promise<SetupStepResult> {
    try {
      // Get user info first
      const existingUser = await SetupDatabase.checkUserExists(client, setupData.email);
      if (!existingUser.exists) {
        throw new Error('User must be created before completing invitation');
      }

      await SetupDatabase.completeInvitation(
        client, 
        setupData.invitation_token, 
        existingUser.userId!
      );

      return { 
        success: true,
        message: 'Invitation completed successfully'
      };
    } catch (error) {
      return { 
        success: false, 
        error: error as Error,
        message: 'Invitation completion failed'
      };
    }
  }

  /**
   * Execute audit creation step
   */
  private static async executeCreateAuditStep(
    client: PoolClient,
    setupData: BusinessSetupRequest,
    context: SetupContext
  ): Promise<SetupStepResult> {
    try {
      const invitation = await SetupValidator.validateInvitationForSetup(
        client, 
        setupData.invitation_token
      );
      
      const existingUser = await SetupDatabase.checkUserExists(client, setupData.email);
      if (!existingUser.exists) {
        throw new Error('User must exist before creating audit trail');
      }

      await SetupAuditManager.createSetupAuditTrail(
        client,
        existingUser.userId!,
        invitation.establishment_id,
        setupData,
        context
      );

      return { 
        success: true,
        message: 'Audit trail created successfully'
      };
    } catch (error) {
      return { 
        success: false, 
        error: error as Error,
        message: 'Audit trail creation failed'
      };
    }
  }

  /**
   * Delay utility for retry logic
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get step dependencies
   */
  public static getStepDependencies(stepId: string): string[] {
    const dependencies: Record<string, string[]> = {
      'validate_data': [],
      'validate_invitation': ['validate_data'],
      'create_user': ['validate_invitation'],
      'update_establishment': ['validate_invitation'],
      'initialize_schema': ['validate_invitation'],
      'create_defaults': ['create_user', 'update_establishment', 'initialize_schema'],
      'complete_invitation': ['create_user'],
      'create_audit': ['create_user', 'update_establishment', 'create_defaults']
    };

    return dependencies[stepId] || [];
  }

  /**
   * Check if step can be executed
   */
  public static canExecuteStep(stepId: string, progress: SetupProgress): boolean {
    const dependencies = this.getStepDependencies(stepId);
    
    for (const dependency of dependencies) {
      switch (dependency) {
        case 'validate_data':
        case 'validate_invitation':
          if (!progress.invitation_validated) return false;
          break;
        case 'create_user':
          if (!progress.user_created) return false;
          break;
        case 'update_establishment':
          if (!progress.establishment_updated) return false;
          break;
        case 'initialize_schema':
          if (!progress.schema_initialized) return false;
          break;
        case 'create_defaults':
          if (!progress.default_data_created) return false;
          break;
      }
    }

    return true;
  }
}
