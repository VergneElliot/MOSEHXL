/**
 * Establishment Model
 * Handles multi-tenant establishment management with schema-based isolation
 */

import { pool } from '../app';
import { randomUUID } from 'crypto';
import { Logger } from '../utils/logger';
import { SchemaManager } from '../services/SchemaManager';

/**
 * Establishment interface
 */
export interface Establishment {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  schema_name: string;
  subscription_plan: 'basic' | 'premium' | 'enterprise';
  subscription_status: 'active' | 'suspended' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

/**
 * Create establishment data interface
 */
export interface CreateEstablishmentData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subscription_plan?: 'basic' | 'premium' | 'enterprise';
}

/**
 * Update establishment data interface
 */
export interface UpdateEstablishmentData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  subscription_plan?: 'basic' | 'premium' | 'enterprise';
  subscription_status?: 'active' | 'suspended' | 'cancelled';
}

/**
 * Professional Establishment Model
 */
export class EstablishmentModel {
  private static logger: Logger;

  /**
   * Initialize with logger
   */
  public static initialize(logger: Logger): void {
    EstablishmentModel.logger = logger;
  }

  /**
   * Create a new establishment with schema isolation
   */
  public static async createEstablishment(data: CreateEstablishmentData): Promise<Establishment> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Generate unique schema name
      const schemaName = `establishment_${randomUUID().replace(/-/g, '_')}`;
      
      // Create establishment record
      const establishmentQuery = `
        INSERT INTO establishments (
          id, name, email, phone, address, schema_name, 
          subscription_plan, subscription_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const establishmentValues = [
        randomUUID(),
        data.name,
        data.email,
        data.phone || null,
        data.address || null,
        schemaName,
        data.subscription_plan || 'basic',
        'active'
      ];

      const establishmentResult = await client.query(establishmentQuery, establishmentValues);
      const establishment = establishmentResult.rows[0];

      // Create isolated schema and tables for this establishment
      SchemaManager.initialize(EstablishmentModel.logger);
      await SchemaManager.createEstablishmentSchema(client, schemaName);

      await client.query('COMMIT');

      EstablishmentModel.logger?.info(
        'Establishment created successfully',
        {
          establishmentId: establishment.id,
          establishmentName: establishment.name,
          schemaName: establishment.schema_name,
          email: establishment.email
        },
        'ESTABLISHMENT_MODEL'
      );

      return establishment;

    } catch (error) {
      await client.query('ROLLBACK');
      
      EstablishmentModel.logger?.error(
        'Failed to create establishment',
        error as Error,
        { establishmentData: data },
        'ESTABLISHMENT_MODEL'
      );
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get establishment by ID
   */
  public static async getById(id: string): Promise<Establishment | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM establishments WHERE id = $1',
        [id]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      EstablishmentModel.logger?.error(
        'Failed to get establishment by ID',
        error as Error,
        { establishmentId: id },
        'ESTABLISHMENT_MODEL'
      );
      throw error;
    }
  }

  /**
   * Get establishment by email
   */
  public static async getByEmail(email: string): Promise<Establishment | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM establishments WHERE email = $1',
        [email]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      EstablishmentModel.logger?.error(
        'Failed to get establishment by email',
        error as Error,
        { email },
        'ESTABLISHMENT_MODEL'
      );
      throw error;
    }
  }

  /**
   * Get all establishments (system admin only)
   */
  public static async getAllEstablishments(): Promise<Establishment[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM establishments ORDER BY created_at DESC'
      );
      
      return result.rows;
    } catch (error) {
      EstablishmentModel.logger?.error(
        'Failed to get all establishments',
        error as Error,
        {},
        'ESTABLISHMENT_MODEL'
      );
      throw error;
    }
  }

  /**
   * Update establishment
   */
  public static async updateEstablishment(id: string, data: UpdateEstablishmentData): Promise<Establishment> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.email !== undefined) {
        fields.push(`email = $${paramIndex++}`);
        values.push(data.email);
      }
      if (data.phone !== undefined) {
        fields.push(`phone = $${paramIndex++}`);
        values.push(data.phone);
      }
      if (data.address !== undefined) {
        fields.push(`address = $${paramIndex++}`);
        values.push(data.address);
      }
      if (data.subscription_plan !== undefined) {
        fields.push(`subscription_plan = $${paramIndex++}`);
        values.push(data.subscription_plan);
      }
      if (data.subscription_status !== undefined) {
        fields.push(`subscription_status = $${paramIndex++}`);
        values.push(data.subscription_status);
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE establishments 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Establishment not found');
      }

      EstablishmentModel.logger?.info(
        'Establishment updated successfully',
        { establishmentId: id, updatedFields: Object.keys(data) },
        'ESTABLISHMENT_MODEL'
      );

      return result.rows[0];
    } catch (error) {
      EstablishmentModel.logger?.error(
        'Failed to update establishment',
        error as Error,
        { establishmentId: id, updateData: data },
        'ESTABLISHMENT_MODEL'
      );
      throw error;
    }
  }

  /**
   * Delete establishment (with schema cleanup)
   */
  public static async deleteEstablishment(id: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get establishment to find schema name
      const establishment = await this.getById(id);
      if (!establishment) {
        throw new Error('Establishment not found');
      }

      // Delete establishment record
      await client.query('DELETE FROM establishments WHERE id = $1', [id]);

      // Drop establishment schema (this will delete all data) using SchemaManager
      await SchemaManager.dropEstablishmentSchema(client, establishment.schema_name);

      await client.query('COMMIT');

      EstablishmentModel.logger?.info(
        'Establishment deleted successfully',
        { establishmentId: id, schemaName: establishment.schema_name },
        'ESTABLISHMENT_MODEL'
      );
    } catch (error) {
      await client.query('ROLLBACK');
      
      EstablishmentModel.logger?.error(
        'Failed to delete establishment',
        error as Error,
        { establishmentId: id },
        'ESTABLISHMENT_MODEL'
      );
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get establishment statistics
   */
  public static async getEstablishmentStats(id: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    activeUsers: number;
    subscriptionStatus: string;
  }> {
    try {
      const establishment = await this.getById(id);
      if (!establishment) {
        throw new Error('Establishment not found');
      }

      // Get orders count and revenue from establishment schema
      const ordersResult = await pool.query(`
        SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue
        FROM "${establishment.schema_name}".orders
        WHERE status = 'completed'
      `);

      // Get active users count
      const usersResult = await pool.query(`
        SELECT COUNT(*) as active_users
        FROM users
        WHERE establishment_id = $1 AND is_active = TRUE
      `, [id]);

      return {
        totalOrders: parseInt(ordersResult.rows[0].total_orders) || 0,
        totalRevenue: parseFloat(ordersResult.rows[0].total_revenue) || 0,
        activeUsers: parseInt(usersResult.rows[0].active_users) || 0,
        subscriptionStatus: establishment.subscription_status
      };
    } catch (error) {
      EstablishmentModel.logger?.error(
        'Failed to get establishment stats',
        error as Error,
        { establishmentId: id },
        'ESTABLISHMENT_MODEL'
      );
      throw error;
    }
  }

  /**
   * Validate establishment data
   */
  public static validateEstablishmentData(data: CreateEstablishmentData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 2) {
      errors.push('Establishment name must be at least 2 characters long');
    }

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Valid email address is required');
    }

    if (data.phone && !/^[\+]?[0-9\s\-\(\)]{8,}$/.test(data.phone)) {
      errors.push('Phone number format is invalid');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 