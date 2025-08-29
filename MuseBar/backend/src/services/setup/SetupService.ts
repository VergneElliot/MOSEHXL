/**
 * Setup Service - Main Service Class
 * Main orchestrator for the modular setup system
 */

import { pool } from '../../app';
import { SetupWizard } from './setupWizard';
import { SetupValidator } from './setupValidator';
import { SetupDatabase } from './setupDatabase';
import { SetupDefaults } from './setupDefaults';
import {
  BusinessSetupRequest,
  BusinessSetupResponse,
  SetupStatusResponse,
  InvitationValidation,
  SetupWizardState,
  SetupProgress
} from './types';
import { Logger } from '../../utils/logger';

/**
 * Setup Service - Main Service Class
 * Backward compatible interface that delegates to the new modular system
 */
export class SetupService {
  private static instance: SetupService;
  private logger: Logger;
  
  private constructor() {
    this.logger = Logger.getInstance();
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): SetupService {
    if (!SetupService.instance) {
      SetupService.instance = new SetupService();
    }
    return SetupService.instance;
  }

  /**
   * Validate invitation token (backward compatible method)
   */
  async validateInvitation(token: string): Promise<InvitationValidation> {
    try {
      return await SetupDatabase.validateInvitation(pool, token);
    } catch (error) {
      this.logger.error(
        'Error validating invitation',
        error as Error,
        { token },
        'SETUP_SERVICE'
      );
      return {
        isValid: false,
        token,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Check setup status (backward compatible method)
   */
  async checkSetupStatus(token: string): Promise<SetupStatusResponse> {
    try {
      return await SetupDatabase.checkSetupStatus(pool, token);
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
   * Complete business setup (backward compatible method)
   */
  async completeBusinessSetup(
    setupData: BusinessSetupRequest,
    ipAddress?: string,
    userAgent?: string
  ): Promise<BusinessSetupResponse> {
    try {
      return await SetupWizard.completeBusinessSetup(
        pool,
        setupData,
        ipAddress,
        userAgent
      );
    } catch (error) {
      this.logger.error(
        'Error completing business setup',
        error as Error,
        { setupData: { ...setupData, password: '[REDACTED]' } },
        'SETUP_SERVICE'
      );
      return {
        success: false,
        message: 'Failed to complete setup. Please try again.'
      };
    }
  }

  /**
   * Get setup wizard state
   */
  async getSetupWizardState(invitationToken: string): Promise<SetupWizardState> {
    try {
      return await SetupWizard.getSetupWizardState(pool, invitationToken);
    } catch (error) {
      this.logger.error(
        'Error getting setup wizard state',
        error as Error,
        { invitationToken },
        'SETUP_SERVICE'
      );
      
      return {
        currentStep: 0,
        totalSteps: SetupWizard.getSetupSteps().length,
        steps: SetupWizard.getSetupSteps(),
        data: {},
        errors: [{ field: 'general', message: 'Error loading setup state' }]
      };
    }
  }

  /**
   * Validate setup data
   */
  validateSetupData(setupData: BusinessSetupRequest): { isValid: boolean; errors: any[] } {
    try {
      const errors = SetupValidator.validateSetupData(setupData);
      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      this.logger.error(
        'Error validating setup data',
        error as Error,
        { setupData: { ...setupData, password: '[REDACTED]' } },
        'SETUP_SERVICE'
      );
      return {
        isValid: false,
        errors: [{ field: 'general', message: 'Validation error' }]
      };
    }
  }

  /**
   * Validate setup step
   */
  validateSetupStep(
    stepId: string,
    data: Partial<BusinessSetupRequest>
  ): { isValid: boolean; errors: any[] } {
    return SetupWizard.validateSetupStep(stepId, data);
  }

  /**
   * Get setup steps
   */
  getSetupSteps() {
    return SetupWizard.getSetupSteps();
  }

  /**
   * Get setup progress
   */
  async getSetupProgress(establishmentId: string): Promise<SetupProgress | null> {
    try {
      return await SetupWizard.getSetupProgress(pool, establishmentId);
    } catch (error) {
      this.logger.error(
        'Error getting setup progress',
        error as Error,
        { establishmentId },
        'SETUP_SERVICE'
      );
      return null;
    }
  }

  /**
   * Cleanup failed setup
   */
  async cleanupFailedSetup(establishmentId: string, userId?: number): Promise<void> {
    try {
      await SetupWizard.cleanupFailedSetup(pool, establishmentId, userId);
    } catch (error) {
      this.logger.error(
        'Error cleaning up failed setup',
        error as Error,
        { establishmentId, userId },
        'SETUP_SERVICE'
      );
      throw error;
    }
  }

  /**
   * Retry setup step
   */
  async retrySetupStep(
    establishmentId: string,
    stepId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      return await SetupWizard.retrySetupStep(pool, establishmentId, stepId);
    } catch (error) {
      this.logger.error(
        'Error retrying setup step',
        error as Error,
        { establishmentId, stepId },
        'SETUP_SERVICE'
      );
      return {
        success: false,
        message: 'Failed to retry setup step'
      };
    }
  }

  /**
   * Create default data for establishment
   */
  async createDefaultData(
    establishmentId: string,
    businessType?: 'cafe' | 'restaurant' | 'bar' | 'retail'
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create default data
      await SetupDefaults.createAllDefaultData(client, establishmentId);
      
      // Customize for business type if specified
      if (businessType) {
        await SetupDefaults.customizeForBusinessType(
          client,
          establishmentId,
          businessType
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove default data (for cleanup)
   */
  async removeDefaultData(establishmentId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await SetupDefaults.removeDefaultData(client, establishmentId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Test setup service connectivity
   */
  async testConnectivity(): Promise<boolean> {
    try {
      const result = await pool.query('SELECT 1 as test');
      return result.rows.length > 0;
    } catch (error) {
      this.logger.error(
        'Setup service connectivity test failed',
        error as Error,
        {},
        'SETUP_SERVICE'
      );
      return false;
    }
  }

  /**
   * Get service status
   */
  getServiceStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    uptime: number;
  } {
    return {
      status: 'healthy',
      version: '2.0.0',
      uptime: process.uptime()
    };
  }
}

