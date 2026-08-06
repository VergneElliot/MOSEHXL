/**
 * Establishment Model
 *
 * Phase B1 (2026-04): The app commits to **shared-table multi-tenancy**.
 * `establishments.schema_name` is legacy metadata and is not used for runtime isolation.
 */

import { pool } from '../db/pool';
import { randomUUID } from 'crypto';
import { Logger } from '../utils/logger';
import { logSoftwareEventBestEffort } from '../services/legal/softwareEventJournal';

/**
 * Establishment interface
 */
export interface Establishment {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  /** Legacy metadata (not a runtime isolation boundary). */
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
 * Legacy: schema name safety.
 *
 * Even though schema-per-tenant is no longer the runtime model, `schema_name` is still stored
 * in DB rows for backward compatibility with older installs and migrations.
 */
const SAFE_SCHEMA_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;

function assertValidSchemaName(schemaName: string): void {
  if (!SAFE_SCHEMA_NAME_REGEX.test(schemaName)) {
    throw new Error(`Invalid schema name format (refused for SQL safety): ${schemaName}`);
  }
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
   * Create a new establishment (shared-table multi-tenancy).
   */
  public static async createEstablishment(data: CreateEstablishmentData): Promise<Establishment> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Legacy metadata: keep a unique schema_name value but do not create per-tenant schemas.
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
        { 
          error: error as Error,
          establishmentData: data 
        },
        'ESTABLISHMENT_MODEL'
      );
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Resolve establishment schema name for use in schema-qualified queries (e.g. "schema".orders).
   * Use this whenever a route or model must query establishment-specific tables (orders, products, etc.).
   * @throws Error if establishment not found or schema_name format is invalid for SQL safety
   */
  public static async getSchemaNameForEstablishment(establishmentId: string): Promise<string> {
    const establishment = await this.getById(establishmentId);
    if (!establishment) {
      throw new Error('Establishment not found');
    }
    assertValidSchemaName(establishment.schema_name);
    return establishment.schema_name;
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
        { 
          error: error as Error,
          establishmentId: id 
        },
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
        { 
          error: error as Error,
          email 
        },
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
        { error: error as Error },
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
      const values: Array<string | number | boolean | null> = [];
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

      if (data.subscription_plan !== undefined || data.subscription_status !== undefined) {
        await logSoftwareEventBestEffort({
          establishmentId: id,
          eventType: 'ESTABLISHMENT_SUBSCRIPTION_UPDATED',
          eventData: {
            update_type: 'subscription_change',
            subscription_plan: data.subscription_plan,
            subscription_status: data.subscription_status,
          },
        });
      }

      return result.rows[0];
    } catch (error) {
      EstablishmentModel.logger?.error(
        'Failed to update establishment',
        { 
          error: error as Error,
          establishmentId: id, 
          updateData: data 
        },
        'ESTABLISHMENT_MODEL'
      );
      throw error;
    }
  }

  /**
   * Delete establishment.
   *
   * Phase B1: no schema-per-tenant cleanup. Tenant data lives in shared tables and is removed
   * by deleting (or detaching) establishment-scoped rows via FK cleanup / cascades.
   * RESTRICT FKs (legal_journal, orders, audit_trail, …) must be cleared explicitly.
   */
  public static async deleteEstablishment(id: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get establishment to find schema name using client connection
      const establishmentResult = await client.query(
        'SELECT * FROM establishments WHERE id = $1',
        [id]
      );
      
      const establishment = establishmentResult.rows[0];
      if (!establishment) {
        throw new Error('Establishment not found');
      }
      // Keep legacy schema_name only as metadata; no per-tenant schema is dropped.
      if (establishment.schema_name) {
        assertValidSchemaName(establishment.schema_name);
      }

      // Helper: delete only when table + establishment_id column both exist.
      const deleteIfExists = async (table: string) => {
        const check = await client.query<{ ok: boolean }>(
          `SELECT EXISTS (
             SELECT 1
             FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = $1
               AND column_name = 'establishment_id'
           ) AS ok`,
          [table]
        );
        if (!check.rows[0]?.ok) return;
        // Whitelisted identifiers only (never interpolate user input).
        await client.query(`DELETE FROM ${table} WHERE establishment_id = $1`, [id]);
      };

      // Memberships / venue permissions
      await deleteIfExists('user_permissions');
      await deleteIfExists('user_establishment_memberships');

      // Admin space
      await deleteIfExists('staff_planning_ics_tokens');
      await deleteIfExists('staff_shifts');
      await deleteIfExists('reservations');
      await deleteIfExists('inbox_attachments');
      await deleteIfExists('inbox_messages');
      await deleteIfExists('admin_document_expiry_reminders');
      await deleteIfExists('admin_documents');

      // Printing / kitchen
      await deleteIfExists('printing_jobs');
      await deleteIfExists('product_kitchen_printers');
      await deleteIfExists('kitchen_printers');
      await deleteIfExists('kitchen_ticket_day_counters');

      // Menu / catalog
      await deleteIfExists('product_option_group_products');
      await deleteIfExists('product_option_choices');
      await deleteIfExists('product_option_groups');
      await deleteIfExists('order_item_options');

      // Fiscal / operational RESTRICT + immutable tables — disable user triggers for teardown.
      await client.query(`SET LOCAL session_replication_role = 'replica'`);
      await deleteIfExists('archive_exports');
      await deleteIfExists('closure_bulletins');
      await deleteIfExists('legal_invoice_counters');
      await deleteIfExists('legal_invoices');
      await deleteIfExists('order_items');
      await deleteIfExists('orders');
      await deleteIfExists('legal_journal');
      await deleteIfExists('audit_trail');
      await client.query(`SET LOCAL session_replication_role = 'origin'`);

      // Settings / invitations / catalog
      await deleteIfExists('business_settings');
      await deleteIfExists('establishment_settings');
      await deleteIfExists('closure_settings');
      await deleteIfExists('user_invitations');
      await deleteIfExists('establishment_setup_progress');
      await deleteIfExists('establishment_setup_steps');
      await deleteIfExists('establishment_status_transitions');
      await deleteIfExists('products');
      await deleteIfExists('categories');

      // Detach users last-active cache pointing at this establishment
      await client.query(
        'UPDATE users SET establishment_id = NULL WHERE establishment_id = $1',
        [id]
      );

      // Delete establishment record (remaining CASCADE FKs clean up automatically)
      await client.query('DELETE FROM establishments WHERE id = $1', [id]);

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
        { 
          error: error as Error,
          message: error instanceof Error ? error.message : String(error),
          establishmentId: id 
        },
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

      const ordersResult = await pool.query(`
        SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue
        FROM orders
        WHERE establishment_id = $1 AND status = 'completed'
      `, [id]);

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
        { 
          error: error as Error,
          establishmentId: id 
        },
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