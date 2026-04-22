/**
 * Establishment Audit Service
 * Handles audit trail creation and management for establishment operations
 */

import { PoolClient } from 'pg';
import { Logger } from '../../utils/logger';

/**
 * Audit data interface
 */
export interface AuditData {
  establishment_id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  id: string;
  establishment_id: string;
  user_id: string;
  action: string;
  details: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

/**
 * Establishment Audit Service Class
 */
export class EstablishmentAuditService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Create audit trail entry
   */
  public async createAuditTrail(
    client: PoolClient,
    auditData: AuditData
  ): Promise<AuditLogEntry> {
    try {
      // Use public.audit_trail columns that exist universally in Phase 1
      const auditQuery = `
        INSERT INTO public.audit_trail (
          user_id, action_type, resource_type, resource_id, action_details, ip_address, user_agent, session_id, establishment_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, action_type as action, "timestamp" as created_at
      `;

      const auditValues = [
        auditData.user_id || null,
        auditData.action,
        'establishment',
        auditData.establishment_id,
        JSON.stringify(auditData.details || {}),
        auditData.ip_address || null,
        auditData.user_agent || null,
        null,
        auditData.establishment_id
      ];

      const result = await client.query(auditQuery, auditValues);
      const auditLog = result.rows[0];

      this.logger.info(
        'Audit trail entry created',
        { 
          audit_id: auditLog.id,
          action: auditData.action,
          establishment_id: auditData.establishment_id
        },
        'ESTABLISHMENT_AUDIT_SERVICE'
      );

      return auditLog;

    } catch (error) {
      this.logger.error(
        'Failed to create audit trail entry',
        { 
          error: error as Error,
          audit_data: auditData
        },
        'ESTABLISHMENT_AUDIT_SERVICE'
      );
      throw error;
    }
  }

  /**
   * Get audit trail for establishment
   */
  public async getEstablishmentAuditTrail(
    client: PoolClient,
    establishmentId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{
    entries: AuditLogEntry[];
    total: number;
  }> {
    try {
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM audit_trail 
        WHERE establishment_id = $1
      `;
      const countResult = await client.query(countQuery, [establishmentId]);
      const total = parseInt(countResult.rows[0].total);

      // Get audit entries
      const entriesQuery = `
        SELECT * FROM audit_trail 
        WHERE establishment_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      const entriesResult = await client.query(entriesQuery, [establishmentId, limit, offset]);

      return {
        entries: entriesResult.rows,
        total
      };

    } catch (error) {
      this.logger.error(
        'Failed to retrieve establishment audit trail',
        { 
          error: error as Error,
          establishment_id: establishmentId
        },
        'ESTABLISHMENT_AUDIT_SERVICE'
      );
      throw error;
    }
  }

  /**
   * Get audit trail by action type
   */
  public async getAuditTrailByAction(
    client: PoolClient,
    action: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{
    entries: AuditLogEntry[];
    total: number;
  }> {
    try {
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM audit_trail 
        WHERE action = $1
      `;
      const countResult = await client.query(countQuery, [action]);
      const total = parseInt(countResult.rows[0].total);

      // Get audit entries
      const entriesQuery = `
        SELECT * FROM audit_trail 
        WHERE action = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      const entriesResult = await client.query(entriesQuery, [action, limit, offset]);

      return {
        entries: entriesResult.rows,
        total
      };

    } catch (error) {
      this.logger.error(
        'Failed to retrieve audit trail by action',
        { 
          error: error as Error,
          action
        },
        'ESTABLISHMENT_AUDIT_SERVICE'
      );
      throw error;
    }
  }

  /**
   * Create establishment creation audit entry
   */
  public async logEstablishmentCreation(
    client: PoolClient,
    establishmentId: string,
    userId: string,
    establishmentData: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLogEntry> {
    // Debug logging to identify the UUID issue
    this.logger.debug(
      'Audit service parameters',
      { 
        establishmentId,
        userId,
        establishmentIdType: typeof establishmentId,
        userIdType: typeof userId,
        establishmentIdLength: establishmentId?.length,
        userIdLength: userId?.length
      },
      'ESTABLISHMENT_AUDIT_SERVICE'
    );

    return this.createAuditTrail(client, {
      establishment_id: establishmentId,
      user_id: userId,
      action: 'establishment_created',
      details: {
        establishment_name: establishmentData.name,
        email: establishmentData.email,
        subscription_plan: establishmentData.subscription_plan || 'basic',
        business_type: establishmentData.business_type || 'other',
        ip_address: ipAddress,
        user_agent: userAgent
      },
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }
}
