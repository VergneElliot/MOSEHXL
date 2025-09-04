/**
 * Validation Step Processor
 * Handles validation-related setup steps
 */

import { PoolClient } from 'pg';
import { BusinessSetupRequest } from '../types';
import { SetupValidator } from '../setupValidator';
import { SetupStepResult } from './types';

/**
 * Validation step processor for setup wizard
 */
export class ValidationStepProcessor {

  /**
   * Execute data validation step
   */
  public static async executeValidateDataStep(
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
  public static async executeValidateInvitationStep(
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
}
