/**
 * Setup Wizard
 * Main orchestrator for the complete setup process
 */

import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';
import {
  BusinessSetupRequest,
  BusinessSetupResponse,
  InvitationValidation,
  SetupContext,
} from '../types';
import { SetupDatabase } from '../setupDatabase';
import { SetupProgressTracker } from './SetupProgressTracker';
import { SetupStepProcessor } from './SetupStepProcessor';
import { SetupAuthManager } from './SetupAuthManager';
import { SetupAuditManager } from './SetupAuditManager';
import { BUSINESS_SETUP_STEPS, updateProgressForStep } from './setupWizardProgress';
import {
  checkSetupStatus,
  getSetupProgress,
  getSetupWizardState,
  getWizardSetupSteps,
  validateInvitation,
  validateSetupStep,
} from './setupWizardState';
import { cleanupFailedSetup, retrySetupStep } from './setupWizardMaintenance';

export class SetupWizard {
  private static logger = Logger.getInstance();

  private static isPoolLike(pool: unknown): pool is { connect: () => Promise<PoolClient> } {
    return typeof (pool as { connect?: unknown })?.connect === 'function';
  }

  private static assertAuthUser(
    user: unknown
  ): asserts user is {
    id: number;
    email: string;
    role: string;
    first_name?: string;
    last_name?: string;
  } {
    const u = user as { id?: unknown; email?: unknown; role?: unknown };
    if (typeof u?.id !== 'number' || typeof u?.email !== 'string' || typeof u?.role !== 'string') {
      throw new Error('Setup created invalid user object');
    }
  }

  public static async completeBusinessSetup(
    pool: { connect: () => Promise<PoolClient> },
    setupData: BusinessSetupRequest,
    ipAddress?: string,
    userAgent?: string
  ): Promise<BusinessSetupResponse> {
    if (!this.isPoolLike(pool)) {
      throw new Error('Invalid pool provided to setup wizard');
    }
    const context = await SetupDatabase.createTransactionContext(pool);
    const { client } = context;

    const setupContext: SetupContext = {
      ipAddress,
      userAgent,
      timestamp: new Date()
    };

    const progressTracker = new SetupProgressTracker();
    const progress = SetupProgressTracker.createEmptyProgress();

    let invitation: InvitationValidation | null = null;
    let newUser: {
      id: number;
      email: string;
      role: string;
      first_name?: string;
      last_name?: string;
    } | null = null;

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

      for (const stepId of BUSINESS_SETUP_STEPS) {
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

        await updateProgressForStep(stepId, progress, client, setupData);

        if (stepId === 'validate_invitation') {
          invitation = stepResult.data as InvitationValidation;
        } else if (stepId === 'create_user') {
          this.assertAuthUser(stepResult.data);
          newUser = stepResult.data;
        }
      }

      this.logger.info('Generating authentication token', {}, 'SETUP_WIZARD');
      if (!invitation) throw new Error('Setup did not produce invitation data');
      if (!newUser) throw new Error('Setup did not produce user data');
      if (!invitation.establishment?.id) throw new Error('Invitation missing establishment context');
      const token = SetupAuthManager.generateAuthToken(newUser, invitation.establishment.id);

      await SetupDatabase.commitTransaction(client, context);

      const metrics = progressTracker.getMetrics();
      this.logger.info(
        'Business setup completed successfully',
        {
          userId: newUser.id,
          establishmentId: invitation.establishment.id,
          transactionId: context.transactionId,
          duration: metrics.totalDuration,
          retryCount: metrics.retryCount
        },
        'SETUP_WIZARD'
      );

      if (!newUser.first_name || !newUser.last_name) {
        throw new Error('User profile incomplete after setup');
      }

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
            id: invitation.establishment.id,
            name: invitation.establishment.name,
            status: 'active'
          }
        },
        token
      };

    } catch (error) {
      if (invitation) {
        await SetupAuditManager.createFailureAuditEntry(
          client,
          newUser?.id || null,
          invitation.establishment?.id ?? '',
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

  public static getSetupSteps = getWizardSetupSteps;
  public static getSetupWizardState = getSetupWizardState;
  public static validateSetupStep = validateSetupStep;
  public static validateInvitation = validateInvitation;
  public static checkSetupStatus = checkSetupStatus;
  public static cleanupFailedSetup = cleanupFailedSetup;
  public static getSetupProgress = getSetupProgress;
  public static retrySetupStep = retrySetupStep;
}
