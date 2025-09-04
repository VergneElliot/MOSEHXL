/**
 * Setup Audit Manager
 * Handles audit trail creation and management for setup process
 */

import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';
import { BusinessSetupRequest, SetupContext } from '../types';
import { SetupAuditEntry } from './types';

/**
 * Setup audit management service
 */
export class SetupAuditManager {
  private static logger = Logger.getInstance();

  /**
   * Create setup audit trail entry
   */
  public static async createSetupAuditTrail(
    client: PoolClient,
    userId: number,
    establishmentId: string,
    setupData: BusinessSetupRequest,
    context: SetupContext
  ): Promise<void> {
    try {
      const auditEntry: SetupAuditEntry = {
        user_id: userId,
        establishment_id: establishmentId,
        action: 'business_setup_completed',
        entity_type: 'establishment',
        entity_id: establishmentId,
        old_values: {},
        new_values: {
          business_name: setupData.business_name,
          contact_email: setupData.contact_email,
          phone: setupData.phone,
          address: setupData.address,
          setup_completed: true
        },
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        metadata: {
          setup_timestamp: context.timestamp,
          invitation_token: setupData.invitation_token.substring(0, 8) + '...',
          setup_version: '1.0'
        }
      };

      await this.insertAuditEntry(client, auditEntry);

      this.logger.info(
        'Setup audit trail created successfully',
        { 
          userId, 
          establishmentId, 
          action: auditEntry.action 
        },
        'SETUP_AUDIT'
      );
    } catch (error) {
      // Audit trail failure shouldn't break setup
      this.logger.warn(
        'Failed to create setup audit trail',
        { 
          error: (error as Error).message,
          userId,
          establishmentId 
        },
        'SETUP_AUDIT'
      );
      // Don't re-throw the error
    }
  }

  /**
   * Insert audit entry into database
   */
  private static async insertAuditEntry(
    client: PoolClient,
    entry: SetupAuditEntry
  ): Promise<void> {
    await client.query(`
      INSERT INTO audit_trail (
        user_id, establishment_id, action, entity_type, entity_id,
        old_values, new_values, ip_address, user_agent, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
    `, [
      entry.user_id,
      entry.establishment_id,
      entry.action,
      entry.entity_type,
      entry.entity_id,
      JSON.stringify(entry.old_values),
      JSON.stringify(entry.new_values),
      entry.ip_address,
      entry.user_agent,
      JSON.stringify(entry.metadata)
    ]);
  }

  /**
   * Create step-specific audit entry
   */
  public static async createStepAuditEntry(
    client: PoolClient,
    userId: number,
    establishmentId: string,
    stepId: string,
    stepData: any,
    context: SetupContext
  ): Promise<void> {
    try {
      const auditEntry: SetupAuditEntry = {
        user_id: userId,
        establishment_id: establishmentId,
        action: `setup_step_${stepId}`,
        entity_type: 'setup_step',
        entity_id: stepId,
        old_values: {},
        new_values: stepData,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        metadata: {
          step_timestamp: new Date(),
          step_id: stepId
        }
      };

      await this.insertAuditEntry(client, auditEntry);

      this.logger.debug(
        'Setup step audit entry created',
        { userId, establishmentId, stepId },
        'SETUP_AUDIT'
      );
    } catch (error) {
      this.logger.warn(
        'Failed to create step audit entry',
        { 
          error: (error as Error).message,
          stepId,
          establishmentId 
        },
        'SETUP_AUDIT'
      );
    }
  }

  /**
   * Create failure audit entry
   */
  public static async createFailureAuditEntry(
    client: PoolClient,
    userId: number | null,
    establishmentId: string,
    error: Error,
    stepId?: string,
    context?: SetupContext
  ): Promise<void> {
    try {
      const auditEntry: SetupAuditEntry = {
        user_id: userId || 0,
        establishment_id: establishmentId,
        action: 'setup_failure',
        entity_type: 'setup_process',
        entity_id: establishmentId,
        old_values: {},
        new_values: {
          error_message: error.message,
          error_stack: error.stack,
          failed_step: stepId
        },
        ip_address: context?.ipAddress,
        user_agent: context?.userAgent,
        metadata: {
          failure_timestamp: new Date(),
          failed_step: stepId,
          error_type: error.constructor.name
        }
      };

      await this.insertAuditEntry(client, auditEntry);

      this.logger.warn(
        'Setup failure audit entry created',
        { establishmentId, stepId, error: error.message },
        'SETUP_AUDIT'
      );
    } catch (auditError) {
      this.logger.error(
        'Failed to create failure audit entry',
        auditError as Error,
        'SETUP_AUDIT'
      );
    }
  }

  /**
   * Get setup audit history
   */
  public static async getSetupAuditHistory(
    pool: any,
    establishmentId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM audit_trail 
        WHERE establishment_id = $1 
        AND action LIKE 'setup%' OR action = 'business_setup_completed'
        ORDER BY created_at DESC 
        LIMIT $2
      `, [establishmentId, limit]);

      return result.rows.map((row: any) => ({
        id: row.id,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        old_values: row.old_values,
        new_values: row.new_values,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        metadata: row.metadata,
        created_at: row.created_at
      }));
    } catch (error) {
      this.logger.error(
        'Failed to get setup audit history',
        error as Error,
        'SETUP_AUDIT'
      );
      return [];
    }
  }

  /**
   * Create cleanup audit entry
   */
  public static async createCleanupAuditEntry(
    client: PoolClient,
    establishmentId: string,
    cleanupActions: string[],
    userId?: number
  ): Promise<void> {
    try {
      const auditEntry: SetupAuditEntry = {
        user_id: userId || 0,
        establishment_id: establishmentId,
        action: 'setup_cleanup',
        entity_type: 'establishment',
        entity_id: establishmentId,
        old_values: {},
        new_values: {
          cleanup_actions: cleanupActions,
          cleanup_completed: true
        },
        metadata: {
          cleanup_timestamp: new Date(),
          actions_performed: cleanupActions.length
        }
      };

      await this.insertAuditEntry(client, auditEntry);

      this.logger.info(
        'Setup cleanup audit entry created',
        undefined,
        'SETUP_AUDIT'
      );
    } catch (error) {
      this.logger.warn(
        'Failed to create cleanup audit entry',
        undefined,
        'SETUP_AUDIT'
      );
    }
  }
}
