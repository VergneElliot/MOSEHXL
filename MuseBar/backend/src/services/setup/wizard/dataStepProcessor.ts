/**
 * Data Step Processor
 * Handles database and schema-related setup steps
 */

import { PoolClient } from 'pg';
import { BusinessSetupRequest } from '../types';
import { SetupValidator } from '../setupValidator';
import { SetupDatabase } from '../setupDatabase';
import { SetupDefaults } from '../setupDefaults';
import { SetupStepResult } from './types';

/**
 * Data step processor for setup wizard
 */
export class DataStepProcessor {

  /**
   * Execute establishment update step
   */
  public static async executeUpdateEstablishmentStep(
    client: PoolClient,
    setupData: BusinessSetupRequest
  ): Promise<SetupStepResult> {
    try {
      const invitation = await SetupValidator.validateInvitationForSetup(
        client, 
        setupData.invitation_token
      );

      await SetupDatabase.updateEstablishmentFromSetup(
        client, 
        invitation.establishment_id, 
        setupData
      );

      return { 
        success: true, 
        message: 'Establishment updated successfully'
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
  public static async executeInitializeSchemaStep(
    client: PoolClient,
    setupData: BusinessSetupRequest
  ): Promise<SetupStepResult> {
    try {
      const invitation = await SetupValidator.validateInvitationForSetup(
        client, 
        setupData.invitation_token
      );

      await SetupDatabase.initializeEstablishmentSchema(
        client, 
        invitation.establishment_id
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
  public static async executeCreateDefaultsStep(
    client: PoolClient,
    setupData: BusinessSetupRequest
  ): Promise<SetupStepResult> {
    try {
      const invitation = await SetupValidator.validateInvitationForSetup(
        client, 
        setupData.invitation_token
      );

      await SetupDefaults.createEstablishmentDefaults(
        client, 
        invitation.establishment_id, 
        setupData
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
}
