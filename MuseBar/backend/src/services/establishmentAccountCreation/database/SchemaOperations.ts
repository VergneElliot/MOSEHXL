import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';
import { AuditTrailModel } from '../../../models/auditTrail';

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
   * Create establishment-specific schema for data isolation
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

      // 2. Create basic tables in the schema
      const tablesCreated = await this.createBasicTables(client, schemaName);

      // 3. Set up permissions for the schema
      await this.setupSchemaPermissions(client, schemaName, establishmentId);

      // 4. Log audit trail
      await AuditTrailModel.logAction({
        user_id: userId,
        action_type: 'ESTABLISHMENT_SCHEMA_CREATED',
        resource_type: 'SCHEMA',
        resource_id: schemaName,
        action_details: {
          schema_name: schemaName,
          establishment_id: establishmentId,
          establishment_name: establishmentName,
          tables_created: tablesCreated,
          isolation_type: 'schema_based'
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      this.logger.info('Audit trail logged for schema creation', { schemaName, establishmentId });

      return {
        schemaName,
        establishmentId,
        tablesCreated
      };

    } catch (error) {
      this.logger.error('Failed to create establishment schema', error as Error, { 
        schemaName, 
        establishmentId 
      });
      throw new Error(`Failed to create establishment schema: ${(error as Error).message}`);
    }
  }

  /**
   * Create basic tables in the establishment schema
   */
  private async createBasicTables(client: PoolClient, schemaName: string): Promise<string[]> {
    const tablesCreated: string[] = [];

    try {
      // 1. Create menu_items table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}".menu_items (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          category VARCHAR(100),
          is_available BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      tablesCreated.push('menu_items');

      // 2. Create orders table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}".orders (
          id SERIAL PRIMARY KEY,
          order_number VARCHAR(50) UNIQUE NOT NULL,
          table_number VARCHAR(20),
          customer_name VARCHAR(255),
          total_amount DECIMAL(10,2) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          payment_status VARCHAR(50) DEFAULT 'unpaid',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      tablesCreated.push('orders');

      // 3. Create order_items table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}".order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES "${schemaName}".orders(id) ON DELETE CASCADE,
          menu_item_id INTEGER REFERENCES "${schemaName}".menu_items(id),
          quantity INTEGER NOT NULL DEFAULT 1,
          unit_price DECIMAL(10,2) NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      tablesCreated.push('order_items');

      // 4. Create transactions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}".transactions (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES "${schemaName}".orders(id),
          amount DECIMAL(10,2) NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          payment_status VARCHAR(50) DEFAULT 'completed',
          transaction_reference VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      tablesCreated.push('transactions');

      // 5. Create tables table (for table management)
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}".tables (
          id SERIAL PRIMARY KEY,
          table_number VARCHAR(20) UNIQUE NOT NULL,
          capacity INTEGER NOT NULL,
          status VARCHAR(50) DEFAULT 'available',
          current_order_id INTEGER REFERENCES "${schemaName}".orders(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      tablesCreated.push('tables');

      this.logger.info('Basic tables created in establishment schema', { 
        schemaName, 
        tablesCreated: tablesCreated.length 
      });

      return tablesCreated;

    } catch (error) {
      this.logger.error('Failed to create basic tables in schema', error as Error, { schemaName });
      throw new Error(`Failed to create basic tables: ${(error as Error).message}`);
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
      this.logger.error('Failed to set up schema permissions', error as Error, { schemaName });
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
      this.logger.error('Failed to check schema existence', error as Error, { schemaName });
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
      this.logger.error('Failed to get schema info', error as Error, { schemaName });
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

      // Log audit trail
      await AuditTrailModel.logAction({
        user_id: userId,
        action_type: 'ESTABLISHMENT_SCHEMA_CLEANED_UP',
        resource_type: 'SCHEMA',
        resource_id: schemaName,
        action_details: {
          schema_name: schemaName,
          establishment_id: establishmentId,
          cleanup_type: 'schema_drop'
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

    } catch (error) {
      this.logger.error('Failed to cleanup schema', error as Error, { schemaName });
      throw new Error(`Failed to cleanup schema: ${(error as Error).message}`);
    }
  }
}
