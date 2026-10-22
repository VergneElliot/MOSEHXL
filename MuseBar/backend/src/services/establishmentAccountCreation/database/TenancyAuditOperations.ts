import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';

export interface TenancyInitData {
  establishmentId: string;
  establishmentName: string;
}

/**
 * Shared-table multi-tenancy: there is no per-establishment schema to create. The only
 * step left from the former schema-creation phase is the audit row that records when a
 * tenant became active, which keeps the account-creation trail complete.
 */
export class TenancyAuditOperations {
  constructor(private readonly logger: Logger) {}

  public async logTenancyInitialized(
    client: PoolClient,
    data: TenancyInitData,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const { establishmentId, establishmentName } = data;
    try {
      await client.query(
        `INSERT INTO audit_trail (
          user_id, action_type, resource_type, resource_id,
          action_details, ip_address, user_agent, session_id, establishment_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          'ESTABLISHMENT_TENANCY_INITIALIZED',
          'TENANCY',
          establishmentId,
          JSON.stringify({
            establishment_id: establishmentId,
            establishment_name: establishmentName,
            tables_created: [],
            isolation_type: 'shared_table',
          }),
          ipAddress,
          userAgent,
          null,
          establishmentId,
        ]
      );
      this.logger.info('Tenant initialization logged (shared-table)', { establishmentId });
    } catch (error) {
      this.logger.error('Failed to log tenant initialization', error as Error);
      throw new Error(`Failed to log tenant initialization: ${(error as Error).message}`);
    }
  }
}
