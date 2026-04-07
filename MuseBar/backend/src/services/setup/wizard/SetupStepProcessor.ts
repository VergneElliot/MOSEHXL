/**
 * Setup Step Processor
 * REFACTORED: Main step processor that delegates to specialized step processors
 * The original 449-line processor has been modularized into:
 * - validationStepProcessor.ts (Validation operations)
 * - userStepProcessor.ts (User management operations)
 * - dataStepProcessor.ts (Database/schema operations)
 * - completionStepProcessor.ts (Completion operations)
 * - SetupStepProcessor.ts (Main coordinator)
 */

import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';
import { BusinessSetupRequest, SetupContext, SetupProgress } from '../types';
import { SetupStepResult, SetupRetryOptions } from './types';
import { ValidationStepProcessor } from './validationStepProcessor';
import { UserStepProcessor } from './userStepProcessor';
import { DataStepProcessor } from './dataStepProcessor';
import { CompletionStepProcessor } from './completionStepProcessor';

/**
 * Main setup step processing service - delegates to specialized processors
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
          
          // Progress is tracked through the progress object, not individual step updates
          // The main progress tracking happens in the wizard orchestrator
          
          return result;
        } else {
          lastError = result.error || new Error(result.message);
          
          if (attempt < maxAttempts) {
            this.logger.warn(
              `Setup step failed, retrying: ${stepId} (attempt ${attempt}/${maxAttempts})`,
              { stepId, attempt, error: lastError.message },
              'SETUP_STEP_PROCESSOR'
            );
            
            // Progress is tracked through the progress object, not individual step updates
            
            // Wait before retry if specified
            if (retryOptions?.delayMs && attempt < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, retryOptions.delayMs));
            }
          }
        }
      } catch (error) {
        lastError = error as Error;
        
        this.logger.error(
          `Setup step execution error: ${stepId} (attempt ${attempt}/${maxAttempts})`,
          lastError,
          'SETUP_STEP_PROCESSOR'
        );
        
        if (attempt < maxAttempts && retryOptions?.delayMs) {
          await new Promise(resolve => setTimeout(resolve, retryOptions.delayMs));
        }
      }
    }

    // All attempts failed - progress is tracked through the progress object

    return { 
      success: false, 
      error: lastError || new Error('Step execution failed'),
      message: `Step ${stepId} failed after ${maxAttempts} attempts`
    };
  }

  /**
   * Execute step by delegating to appropriate processor
   */
  private static async executeStepInternal(
    stepId: string,
    client: PoolClient,
    setupData: BusinessSetupRequest,
    context: SetupContext,
    progress: SetupProgress
  ): Promise<SetupStepResult> {
    void progress;
    switch (stepId) {
      // Validation steps
      case 'validate_data':
        return ValidationStepProcessor.executeValidateDataStep(setupData);
        
      case 'validate_invitation':
        return ValidationStepProcessor.executeValidateInvitationStep(client, setupData);

      // User management steps
      case 'create_user':
        return UserStepProcessor.executeCreateUserStep(client, setupData);
        
      case 'create_audit':
        return UserStepProcessor.executeCreateAuditStep(client, setupData, context);

      // Data/schema steps
      case 'update_establishment':
        return DataStepProcessor.executeUpdateEstablishmentStep(client, setupData);
        
      case 'initialize_schema':
        return DataStepProcessor.executeInitializeSchemaStep(client, setupData);
        
      case 'create_defaults':
        return DataStepProcessor.executeCreateDefaultsStep(client, setupData);

      // Completion steps
      case 'complete_invitation':
        return CompletionStepProcessor.executeCompleteInvitationStep(client, setupData);

      default:
        return {
          success: false,
          error: new Error(`Unknown step: ${stepId}`),
          message: `Step ${stepId} is not recognized`
        };
    }
  }
}