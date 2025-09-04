/**
 * User Step Processor
 * Handles user-related setup steps
 */

import { PoolClient } from 'pg';
import { BusinessSetupRequest, SetupContext } from '../types';
import { SetupValidator } from '../setupValidator';
import { SetupDatabase } from '../setupDatabase';
import { SetupAuditManager } from './SetupAuditManager';
import { SetupStepResult } from './types';

/**
 * User step processor for setup wizard
 */
export class UserStepProcessor {

  /**
   * Execute user creation step
   */
  public static async executeCreateUserStep(
    client: PoolClient,
    setupData: BusinessSetupRequest
  ): Promise<SetupStepResult> {
    try {
      const invitation = await SetupValidator.validateInvitationForSetup(
        client, 
        setupData.invitation_token
      );

      const existingUser = await SetupDatabase.checkUserExists(client, setupData.email);
      const newUser = await SetupDatabase.createOrUpdateUserAccount(
        client, 
        setupData, 
        invitation.establishment_id
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
   * Execute audit creation step
   */
  public static async executeCreateAuditStep(
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
        message: 'Audit creation failed'
      };
    }
  }
}
