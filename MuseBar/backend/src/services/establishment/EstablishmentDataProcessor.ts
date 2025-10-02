/**
 * Establishment Data Processor
 * Handles database operations and data processing for establishments
 */

import { PoolClient } from 'pg';
import { Logger } from '../../utils/logger';
import { EnhancedCreateEstablishmentRequest } from './EstablishmentValidator';
import { randomUUID } from 'crypto';

/**
 * Establishment record interface
 */
export interface EstablishmentRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  schema_name: string;
  subscription_plan: string;
  subscription_status: string;
  status: string;
  tva_number?: string;
  siret_number?: string;
  business_type: string;
  timezone: string;
  language: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Establishment Data Processor Class
 */
export class EstablishmentDataProcessor {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Check establishment uniqueness
   */
  public async checkEstablishmentUniqueness(
    client: PoolClient, 
    data: EnhancedCreateEstablishmentRequest
  ): Promise<void> {
    // Check name uniqueness
    const nameCheck = await client.query(
      'SELECT id FROM establishments WHERE LOWER(name) = LOWER($1)',
      [data.name.trim()]
    );

    if (nameCheck.rows.length > 0) {
      throw new Error('Establishment with this name already exists');
    }

    // Email uniqueness check removed - users can have multiple establishments with same email
  }

  /**
   * Create establishment record in database
   */
  public async createEstablishmentRecord(
    client: PoolClient,
    data: EnhancedCreateEstablishmentRequest,
    schemaName: string
  ): Promise<EstablishmentRecord> {
    const establishmentQuery = `
      INSERT INTO establishments (
        name, email, phone, address, schema_name,
        subscription_plan, subscription_status, status,
        tva_number, siret_number, business_type, timezone, language
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const establishmentValues = [
      data.name.trim(),
      data.email.toLowerCase(),
      data.phone || null,
      data.address || null,
      schemaName,
      data.subscription_plan || 'basic',
      'active',
      'setup_required',
      data.tva_number || null,
      data.siret_number || null,
      data.business_type || 'other',
      data.timezone || 'Europe/Paris',
      data.language || 'fr'
    ];

    const result = await client.query(establishmentQuery, establishmentValues);
    return result.rows[0];
  }

  /**
   * Create establishment schema and tables
   */
  public async createEstablishmentSchema(client: PoolClient, schemaName: string): Promise<void> {
    try {
      // Initialize SchemaManager
      const { SchemaManager } = await import('../SchemaManager');
      SchemaManager.initialize(this.logger);
      
      await SchemaManager.createEstablishmentSchema(client, schemaName);

      this.logger.info(
        'Establishment schema created successfully',
        { schemaName },
        'ESTABLISHMENT_DATA_PROCESSOR'
      );

    } catch (error) {
      this.logger.error(
        'Failed to create establishment schema',
        { error: error as Error, schemaName },
        'ESTABLISHMENT_DATA_PROCESSOR'
      );
      throw error;
    }
  }

  /**
   * Generate unique schema name
   */
  public generateSchemaName(): string {
    return `establishment_${randomUUID().replace(/-/g, '_')}`;
  }

  /**
   * Get establishment creation statistics
   */
  public async getCreationStats(client: PoolClient): Promise<{
    total_establishments: number;
    pending_setup: number;
    active: number;
    suspended: number;
    this_month: number;
  }> {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_establishments,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_setup,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as this_month
      FROM establishments
    `;

    const result = await client.query(statsQuery);
    return result.rows[0];
  }
}
