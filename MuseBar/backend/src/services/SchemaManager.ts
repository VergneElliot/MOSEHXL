/**
 * Schema Manager
 * Handles database schema creation and management for multi-tenant establishments
 */

import { PoolClient } from 'pg';
import { Logger } from '../utils/logger';

/**
 * Schema Manager Class
 */
export class SchemaManager {
  private static logger: Logger;

  /**
   * Initialize with logger
   */
  public static initialize(logger: Logger): void {
    SchemaManager.logger = logger;
  }

  /**
   * Create complete establishment schema with all required tables
   */
  public static async createEstablishmentSchema(client: PoolClient, schemaName: string): Promise<void> {
    try {
      // Create the schema
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      
      // Create all establishment-specific tables
      await this.createOrdersTable(client, schemaName);
      await this.createOrderItemsTable(client, schemaName);
      await this.createProductsTable(client, schemaName);
      await this.createCategoriesTable(client, schemaName);
      await this.createLegalJournalTable(client, schemaName);
      await this.createAuditTrailTable(client, schemaName);
      
      // Create performance indexes
      await this.createPerformanceIndexes(client, schemaName);

      SchemaManager.logger?.info(
        'Establishment schema created successfully',
        { schemaName },
        'SCHEMA_MANAGER'
      );

    } catch (error) {
      SchemaManager.logger?.error(
        'Failed to create establishment schema',
        error as Error,
        { schemaName },
        'SCHEMA_MANAGER'
      );
      throw error;
    }
  }

  /**
   * Create orders table for establishment
   */
  private static async createOrdersTable(client: PoolClient, schemaName: string): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".orders (
        id SERIAL PRIMARY KEY,
        total_amount DECIMAL(10,2) NOT NULL,
        total_tax DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        notes TEXT,
        tips DECIMAL(10,2) DEFAULT 0,
        change DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Create order_items table for establishment
   */
  private static async createOrderItemsTable(client: PoolClient, schemaName: string): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES "${schemaName}".orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL,
        product_name VARCHAR(200) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        tax_rate DECIMAL(5,2) NOT NULL,
        tax_amount DECIMAL(10,2) NOT NULL,
        happy_hour_applied BOOLEAN DEFAULT FALSE,
        happy_hour_discount_amount DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Create products table for establishment
   */
  private static async createProductsTable(client: PoolClient, schemaName: string): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category_id INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Create categories table for establishment
   */
  private static async createCategoriesTable(client: PoolClient, schemaName: string): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#1976d2',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Create legal_journal table for establishment
   */
  private static async createLegalJournalTable(client: PoolClient, schemaName: string): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".legal_journal (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES "${schemaName}".orders(id),
        entry_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Create audit_trail table for establishment
   */
  private static async createAuditTrailTable(client: PoolClient, schemaName: string): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".audit_trail (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action_type VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(100),
        action_details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Create performance indexes for establishment schema
   */
  private static async createPerformanceIndexes(client: PoolClient, schemaName: string): Promise<void> {
    // Sanitize schema name for index names (replace special characters)
    const indexPrefix = schemaName.replace(/[^a-zA-Z0-9_]/g, '_');
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_${indexPrefix}_orders_created_at ON "${schemaName}".orders(created_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_${indexPrefix}_orders_status ON "${schemaName}".orders(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_${indexPrefix}_products_category ON "${schemaName}".products(category_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_${indexPrefix}_audit_trail_user ON "${schemaName}".audit_trail(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_${indexPrefix}_order_items_order ON "${schemaName}".order_items(order_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_${indexPrefix}_legal_journal_order ON "${schemaName}".legal_journal(order_id)`);
  }

  /**
   * Drop establishment schema and all its data
   */
  public static async dropEstablishmentSchema(client: PoolClient, schemaName: string): Promise<void> {
    try {
      await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);

      SchemaManager.logger?.info(
        'Establishment schema dropped successfully',
        { schemaName },
        'SCHEMA_MANAGER'
      );

    } catch (error) {
      SchemaManager.logger?.error(
        'Failed to drop establishment schema',
        error as Error,
        { schemaName },
        'SCHEMA_MANAGER'
      );
      throw error;
    }
  }

  /**
   * Check if schema exists
   */
  public static async schemaExists(client: PoolClient, schemaName: string): Promise<boolean> {
    try {
      const result = await client.query(
        'SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1',
        [schemaName]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      SchemaManager.logger?.error(
        'Failed to check schema existence',
        error as Error,
        { schemaName },
        'SCHEMA_MANAGER'
      );
      throw error;
    }
  }

  /**
   * Get schema table count
   */
  public static async getSchemaTableCount(client: PoolClient, schemaName: string): Promise<number> {
    try {
      const result = await client.query(
        'SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = $1',
        [schemaName]
      );
      
      return parseInt(result.rows[0].table_count) || 0;
    } catch (error) {
      SchemaManager.logger?.error(
        'Failed to get schema table count',
        error as Error,
        { schemaName },
        'SCHEMA_MANAGER'
      );
      throw error;
    }
  }

  /**
   * Validate schema integrity
   */
  public static async validateSchemaIntegrity(client: PoolClient, schemaName: string): Promise<{
    isValid: boolean;
    missingTables: string[];
    issues: string[];
  }> {
    const requiredTables = [
      'orders',
      'order_items', 
      'products',
      'categories',
      'legal_journal',
      'audit_trail'
    ];

    const issues: string[] = [];
    const missingTables: string[] = [];

    try {
      // Check if schema exists
      if (!(await this.schemaExists(client, schemaName))) {
        issues.push('Schema does not exist');
        return { isValid: false, missingTables: requiredTables, issues };
      }

      // Check for required tables
      for (const tableName of requiredTables) {
        const result = await client.query(
          'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2',
          [schemaName, tableName]
        );

        if (result.rows.length === 0) {
          missingTables.push(tableName);
        }
      }

      if (missingTables.length > 0) {
        issues.push(`Missing tables: ${missingTables.join(', ')}`);
      }

      return {
        isValid: issues.length === 0,
        missingTables,
        issues
      };

    } catch (error) {
      SchemaManager.logger?.error(
        'Failed to validate schema integrity',
        error as Error,
        { schemaName },
        'SCHEMA_MANAGER'
      );
      
      issues.push('Failed to validate schema');
      return { isValid: false, missingTables: [], issues };
    }
  }
}