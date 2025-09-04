/**
 * Setup Progress Tracker
 * Handles progress tracking and state management for setup wizard
 */

import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';
import { SetupProgress } from '../types';
import { SetupExecutionMetrics, SetupStepResult } from './types';

/**
 * Setup progress tracking service
 */
export class SetupProgressTracker {
  private static logger = Logger.getInstance();
  private metrics: SetupExecutionMetrics;
  private startTime: number;

  constructor() {
    this.metrics = {
      totalDuration: 0,
      stepDurations: {},
      errors: [],
      retryCount: 0
    };
    this.startTime = Date.now();
  }

  /**
   * Initialize empty progress
   */
  public static createEmptyProgress(): SetupProgress {
    return {
      invitation_validated: false,
      user_created: false,
      establishment_updated: false,
      default_data_created: false,
      schema_initialized: false,
      audit_logged: false
    };
  }

  /**
   * Log setup progress to database
   */
  public static async logSetupProgress(
    client: PoolClient,
    establishmentId: string,
    progress: SetupProgress
  ): Promise<void> {
    try {
      await client.query(`
        INSERT INTO setup_progress (
          establishment_id, 
          invitation_validated, 
          user_created, 
          establishment_updated,
          default_data_created, 
          schema_initialized, 
          audit_logged,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (establishment_id) 
        DO UPDATE SET
          invitation_validated = EXCLUDED.invitation_validated,
          user_created = EXCLUDED.user_created,
          establishment_updated = EXCLUDED.establishment_updated,
          default_data_created = EXCLUDED.default_data_created,
          schema_initialized = EXCLUDED.schema_initialized,
          audit_logged = EXCLUDED.audit_logged,
          updated_at = CURRENT_TIMESTAMP
      `, [
        establishmentId,
        progress.invitation_validated,
        progress.user_created,
        progress.establishment_updated,
        progress.default_data_created,
        progress.schema_initialized,
        progress.audit_logged
      ]);

      this.logger.debug(
        'Setup progress logged',
        { establishmentId, progress },
        'SETUP_PROGRESS'
      );
    } catch (error) {
      this.logger.error(
        'Failed to log setup progress',
        error as Error,
        'SETUP_PROGRESS'
      );
      throw error;
    }
  }

  /**
   * Get setup progress from database
   */
  public static async getSetupProgress(
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
        'SETUP_PROGRESS'
      );
      return null;
    }
  }

  /**
   * Start tracking a step
   */
  public startStep(stepId: string): void {
    this.metrics.stepDurations[stepId] = Date.now();
  }

  /**
   * Complete tracking a step
   */
  public completeStep(stepId: string, result: SetupStepResult): void {
    const startTime = this.metrics.stepDurations[stepId];
    if (startTime) {
      this.metrics.stepDurations[stepId] = Date.now() - startTime;
    }

    if (!result.success && result.error) {
      this.metrics.errors.push({
        step: stepId,
        error: result.error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Record retry attempt
   */
  public recordRetry(): void {
    this.metrics.retryCount++;
  }

  /**
   * Complete tracking and get final metrics
   */
  public getMetrics(): SetupExecutionMetrics {
    this.metrics.totalDuration = Date.now() - this.startTime;
    return { ...this.metrics };
  }

  /**
   * Check if progress is complete
   */
  public static isProgressComplete(progress: SetupProgress): boolean {
    return progress.invitation_validated &&
           progress.user_created &&
           progress.establishment_updated &&
           progress.default_data_created &&
           progress.schema_initialized &&
           progress.audit_logged;
  }

  /**
   * Get progress percentage
   */
  public static getProgressPercentage(progress: SetupProgress): number {
    const steps = [
      progress.invitation_validated,
      progress.user_created,
      progress.establishment_updated,
      progress.default_data_created,
      progress.schema_initialized,
      progress.audit_logged
    ];

    const completedSteps = steps.filter(step => step).length;
    return Math.round((completedSteps / steps.length) * 100);
  }

  /**
   * Get next incomplete step
   */
  public static getNextIncompleteStep(progress: SetupProgress): string | null {
    if (!progress.invitation_validated) return 'invitation_validation';
    if (!progress.user_created) return 'user_creation';
    if (!progress.establishment_updated) return 'establishment_update';
    if (!progress.default_data_created) return 'default_data_creation';
    if (!progress.schema_initialized) return 'schema_initialization';
    if (!progress.audit_logged) return 'audit_logging';
    return null;
  }

  /**
   * Reset progress for retry
   */
  public static async resetProgress(
    client: PoolClient,
    establishmentId: string,
    fromStep?: string
  ): Promise<void> {
    const progress = this.createEmptyProgress();
    
    // If fromStep is specified, keep progress up to that step
    if (fromStep) {
      const steps = [
        'invitation_validation',
        'user_creation', 
        'establishment_update',
        'default_data_creation',
        'schema_initialization',
        'audit_logging'
      ];
      
      const resetFromIndex = steps.indexOf(fromStep);
      if (resetFromIndex > 0) {
        if (resetFromIndex > 0) progress.invitation_validated = true;
        if (resetFromIndex > 1) progress.user_created = true;
        if (resetFromIndex > 2) progress.establishment_updated = true;
        if (resetFromIndex > 3) progress.default_data_created = true;
        if (resetFromIndex > 4) progress.schema_initialized = true;
      }
    }

    await this.logSetupProgress(client, establishmentId, progress);
  }
}
