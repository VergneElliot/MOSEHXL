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
  private static uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private static normalizeEstablishmentId(raw: string): string | null {
    const value = typeof raw === 'string' ? raw.trim() : '';
    return this.uuidRegex.test(value) ? value : null;
  }

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
        establishment_id: this.normalizeEstablishmentId(establishmentId),
        action_type: 'BUSINESS_SETUP_COMPLETED',
        resource_type: 'ESTABLISHMENT',
        resource_id: establishmentId,
        action_details: {
          business_name: setupData.business_name,
          contact_email: setupData.contact_email,
          phone: setupData.phone,
          address: setupData.address,
          setup_completed: true,
          setup_timestamp: context.timestamp,
          setup_version: '1.0'
        } as Record<string, unknown>,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        session_id: context.sessionId
      };

      await this.insertAuditEntry(client, auditEntry);

      this.logger.info(
        'Setup audit trail created successfully',
        { 
          userId, 
          establishmentId, 
          action: auditEntry.action_type
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
        user_id, action_type, resource_type, resource_id, action_details,
        ip_address, user_agent, session_id, establishment_id, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
    `, [
      String(entry.user_id),
      entry.action_type,
      entry.resource_type,
      entry.resource_id,
      JSON.stringify(entry.action_details),
      entry.ip_address,
      entry.user_agent,
      entry.session_id,
      entry.establishment_id
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
    stepData: Record<string, unknown>,
    context: SetupContext
  ): Promise<void> {
    try {
      const auditEntry: SetupAuditEntry = {
        user_id: userId,
        establishment_id: this.normalizeEstablishmentId(establishmentId),
        action_type: `SETUP_STEP_${stepId.toUpperCase()}`,
        resource_type: 'SETUP_STEP',
        resource_id: stepId,
        action_details: {
          ...stepData,
          step_timestamp: new Date(),
          step_id: stepId
        },
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        session_id: context.sessionId
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
        establishment_id: this.normalizeEstablishmentId(establishmentId),
        action_type: 'SETUP_FAILURE',
        resource_type: 'SETUP_PROCESS',
        resource_id: establishmentId,
        action_details: {
          error_message: error.message,
          error_stack: error.stack,
          failed_step: stepId,
          failure_timestamp: new Date(),
          error_type: error.constructor.name
        } as Record<string, unknown>,
        ip_address: context?.ipAddress,
        user_agent: context?.userAgent,
        session_id: context?.sessionId
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
    pool: { query: (queryText: string, values?: unknown[]) => Promise<{ rows: unknown[] }> },
    establishmentId: string,
    limit: number = 50
  ): Promise<Array<Record<string, unknown>>> {
    try {
      const result = await pool.query(`
        SELECT * FROM audit_trail 
        WHERE establishment_id = $1 
          AND (
            action_type = 'BUSINESS_SETUP_COMPLETED'
            OR action_type = 'SETUP_FAILURE'
            OR action_type = 'SETUP_CLEANUP'
            OR action_type LIKE 'SETUP_STEP_%'
          )
        ORDER BY timestamp DESC 
        LIMIT $2
      `, [establishmentId, limit]);

      return result.rows.map((row) => row as Record<string, unknown>);
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
        establishment_id: this.normalizeEstablishmentId(establishmentId),
        action_type: 'SETUP_CLEANUP',
        resource_type: 'ESTABLISHMENT',
        resource_id: establishmentId,
        action_details: {
          cleanup_actions: cleanupActions,
          cleanup_completed: true,
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
    } catch {
      this.logger.warn(
        'Failed to create cleanup audit entry',
        undefined,
        'SETUP_AUDIT'
      );
    }
  }
}
