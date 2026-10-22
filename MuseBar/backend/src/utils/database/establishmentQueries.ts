/**
 * Establishment-related shared queries
 */

import { PoolClient } from 'pg';
import { pool } from '../../db/pool';

export class EstablishmentQueries {

  /**
   * Get establishment by ID
   * Consolidates establishment lookup queries
   */
  static async getEstablishmentById(
    client: PoolClient | typeof pool,
    establishmentId: string
  ) {
    const result = await client.query(`
      SELECT 
        id,
        name,
        email,
        address,
        phone,
        siret,
        vat_number,
        tva_number,
        siret_number,
        timezone,
        currency,
        subscription_plan,
        status,
        created_at,
        updated_at,
        activated_at
      FROM establishments
      WHERE id = $1
    `, [establishmentId]);

    return result.rows[0] || null;
  }

  /**
   * Get establishment by email
   */
  static async getEstablishmentByEmail(
    client: PoolClient | typeof pool,
    email: string
  ) {
    const result = await client.query(`
      SELECT * FROM establishments WHERE email = $1
    `, [email]);

    return result.rows[0] || null;
  }

  /**
   * Get all establishments with optional filtering
   */
  static async getAllEstablishments(
    client: PoolClient | typeof pool,
    options: {
      status?: string;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {}
  ) {
    const {
      status,
      limit,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    let query = `
      SELECT 
        id, name, email, phone, address, tva_number, siret_number,
        subscription_plan, status, created_at, updated_at
      FROM establishments
    `;

    const queryParams: Array<string | number> = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` WHERE status = $${paramCount}`;
      queryParams.push(status);
    }

    const validSortFields = ['name', 'email', 'status', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    query += ` ORDER BY ${sortField} ${sortOrder}`;

    if (limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      queryParams.push(limit);
    }

    if (offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      queryParams.push(offset);
    }

    const result = await client.query(query, queryParams);
    return result.rows;
  }

  /**
   * Update establishment status
   * Commonly used for activation/deactivation
   */
  static async updateEstablishmentStatus(
    client: PoolClient | typeof pool,
    establishmentId: string,
    status: string,
    activatedAt?: Date
  ) {
    const updateFields = ['status = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const queryParams: Array<string | Date> = [establishmentId, status];
    let paramCount = 2;

    if (activatedAt) {
      paramCount++;
      updateFields.push(`activated_at = $${paramCount}`);
      queryParams.push(activatedAt);
    }

    const query = `
      UPDATE establishments 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await client.query(query, queryParams);
    return result.rows[0];
  }
}
