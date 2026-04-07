/**
 * Completion Step Processor
 * Handles completion and finalization-related setup steps
 */

import { PoolClient } from 'pg';
import { BusinessSetupRequest } from '../types';
import { SetupValidator } from '../setupValidator';
import { SetupDatabase } from '../setupDatabase';
import { SetupStepResult } from './types';

/**
 * Completion step processor for setup wizard
 */
export class CompletionStepProcessor {

  /**
   * Execute invitation completion step
   */
  public static async executeCompleteInvitationStep(
    client: PoolClient,
    setupData: BusinessSetupRequest
  ): Promise<SetupStepResult> {
    try {
      const invitation = await SetupValidator.validateInvitationForSetup(
        client, 
        setupData.invitation_token
      );
      void invitation;
      
      const existingUser = await SetupDatabase.checkUserExists(client, setupData.email);
      if (!existingUser.exists) {
        throw new Error('User must exist before completing invitation');
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
}
