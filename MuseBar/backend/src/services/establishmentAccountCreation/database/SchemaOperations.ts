import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';
import { SchemaManager } from '../../../services/SchemaManager';

export interface SchemaCreationData {
  establishmentId: string;
  establishmentName: string;
}

export interface CreatedSchema {
  schemaName: string;
  establishmentId: string;
  tablesCreated: string[];
}

export class SchemaOperations {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Create establishment-specific schema for data isolation.
   * Uses SchemaManager so the same tables exist as in the admin-creation flow (orders, order_items, products, categories, legal_journal, audit_trail).
   */
  public async createEstablishmentSchema(
    client: PoolClient,
    schemaData: SchemaCreationData,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<CreatedSchema> {
    const { establishmentId, establishmentName } = schemaData;
    const schemaName = `establishment_${establishmentId}`;

    try {
      // 1. Create the schema
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      this.logger.info('Establishment schema created', { schemaName, establishmentId });

      // 2. Create tables using SchemaManager (single source of truth — same structure as admin-creation flow)
      SchemaManager.initialize(this.logger);
      await SchemaManager.createEstablishmentSchema(client, schemaName);
      const tablesCreated = ['orders', 'order_items', 'products', 'categories', 'legal_journal', 'audit_trail'];

      // 3. Set up permissions for the schema
      await this.setupSchemaPermissions(client, schemaName, establishmentId);

      // 4. Log audit trail using transaction client to avoid deadlocks
      await client.query(
        `INSERT INTO audit_trail (
          user_id, action_type, resource_type, resource_id,
          action_details, ip_address, user_agent, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          'ESTABLISHMENT_SCHEMA_CREATED',
          'SCHEMA',
          schemaName,
          JSON.stringify({
            schema_name: schemaName,
            establishment_id: establishmentId,
            establishment_name: establishmentName,
            tables_created: tablesCreated,
            isolation_type: 'schema_based'
          }),
          ipAddress,
          userAgent,
          null
        ]
      );

      this.logger.info('Audit trail logged for schema creation', { schemaName, establishmentId });

      return {
        schemaName,
        establishmentId,
        tablesCreated
      };

    } catch (error) {
      this.logger.error('Failed to create establishment schema', error as Error);
      throw new Error(`Failed to create establishment schema: ${(error as Error).message}`);
    }
  }

  /**
   * Set up permissions for the establishment schema
   */
  private async setupSchemaPermissions(
    client: PoolClient, 
    schemaName: string, 
    establishmentId: string
  ): Promise<void> {
    try {
      // Grant usage on schema to the application user
      await client.query(`GRANT USAGE ON SCHEMA "${schemaName}" TO current_user`);
      
      // Grant all privileges on all tables in the schema
      await client.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "${schemaName}" TO current_user`);
      
      // Grant all privileges on all sequences in the schema
      await client.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "${schemaName}" TO current_user`);

      this.logger.info('Schema permissions set up', { schemaName, establishmentId });

    } catch (error) {
      this.logger.error('Failed to set up schema permissions', error as Error);
      throw new Error(`Failed to set up schema permissions: ${(error as Error).message}`);
    }
  }

  /**
   * Validate schema creation data
   */
  public validateSchemaCreationData(schemaData: SchemaCreationData): { isValid: boolean; error?: string } {
    const { establishmentId, establishmentName } = schemaData;

    if (!establishmentId || establishmentId.trim() === '') {
      return { isValid: false, error: 'Establishment ID is required' };
    }

    if (!establishmentName || establishmentName.trim() === '') {
      return { isValid: false, error: 'Establishment name is required' };
    }

    // Validate establishment ID format (should be UUID or numeric)
    const idRegex = /^[a-zA-Z0-9\-_]+$/;
    if (!idRegex.test(establishmentId)) {
      return { isValid: false, error: 'Invalid establishment ID format' };
    }

    return { isValid: true };
  }

  /**
   * Check if schema already exists
   */
  public async checkSchemaExists(client: PoolClient, establishmentId: string): Promise<boolean> {
    const schemaName = `establishment_${establishmentId}`;
    
    try {
      const result = await client.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
        [schemaName]
      );

      const exists = result.rows.length > 0;
      this.logger.debug('Schema existence check completed', { schemaName, exists });
      return exists;

    } catch (error) {
      this.logger.error('Failed to check schema existence', error as Error);
      throw new Error(`Failed to check schema existence: ${(error as Error).message}`);
    }
  }

  /**
   * Get schema information
   */
  public async getSchemaInfo(client: PoolClient, establishmentId: string): Promise<{
    exists: boolean;
    schemaName?: string;
    tableCount?: number;
  }> {
    const schemaName = `establishment_${establishmentId}`;
    
    try {
      // Check if schema exists
      const schemaResult = await client.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
        [schemaName]
      );

      if (schemaResult.rows.length === 0) {
        return { exists: false };
      }

      // Get table count
      const tableResult = await client.query(
        `SELECT COUNT(*) as table_count 
         FROM information_schema.tables 
         WHERE table_schema = $1`,
        [schemaName]
      );

      const tableCount = parseInt(tableResult.rows[0].table_count);

      this.logger.debug('Schema info retrieved', { schemaName, tableCount });

      return {
        exists: true,
        schemaName,
        tableCount
      };

    } catch (error) {
      this.logger.error('Failed to get schema info', error as Error);
      throw new Error(`Failed to get schema info: ${(error as Error).message}`);
    }
  }

  /**
   * Clean up schema (for testing or error recovery)
   */
  public async cleanupSchema(
    client: PoolClient,
    establishmentId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const schemaName = `establishment_${establishmentId}`;
    
    try {
      // Drop the schema and all its contents
      await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);

      this.logger.info('Schema cleaned up', { schemaName, establishmentId });

      // Log audit trail using transaction client
      await client.query(
        `INSERT INTO audit_trail (
          user_id, action_type, resource_type, resource_id,
          action_details, ip_address, user_agent, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          'ESTABLISHMENT_SCHEMA_CLEANED_UP',
          'SCHEMA',
          schemaName,
          JSON.stringify({
            schema_name: schemaName,
            establishment_id: establishmentId,
            cleanup_type: 'schema_drop'
          }),
          ipAddress,
          userAgent,
          null
        ]
      );

    } catch (error) {
      this.logger.error('Failed to cleanup schema', error as Error);
      throw new Error(`Failed to cleanup schema: ${(error as Error).message}`);
    }
  }
}
