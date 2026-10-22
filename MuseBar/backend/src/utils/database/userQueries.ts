/**
 * User-related shared queries
 */

import { PoolClient } from 'pg';
import { pool } from '../../db/pool';

export class UserQueries {

  /**
   * Get user by ID with establishment info
   * Consolidates similar queries from multiple services
   */
  static async getUserWithEstablishment(
    client: PoolClient | typeof pool,
    userId: number | string
  ) {
    const result = await client.query(`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.role,
        u.is_admin,
        u.is_active,
        u.establishment_id,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        e.name as establishment_name,
        e.status as establishment_status
      FROM users u
      LEFT JOIN establishments e ON u.establishment_id = e.id
      WHERE u.id = $1
    `, [userId]);

    return result.rows[0] || null;
  }

  /**
   * Get user by email
   * Consolidates email-based user lookups
   */
  static async getUserByEmail(
    client: PoolClient | typeof pool,
    email: string
  ) {
    const result = await client.query(`
      SELECT 
        id, 
        first_name, 
        last_name, 
        email, 
        establishment_id,
        role,
        is_admin,
        is_active,
        created_at
      FROM users 
      WHERE email = $1
    `, [email]);

    return result.rows[0] || null;
  }

  /**
   * Check if user exists by email
   * Standardized user existence check
   */
  static async checkUserExists(
    client: PoolClient | typeof pool,
    email: string
  ): Promise<{
    exists: boolean;
    user?: unknown;
    hasEstablishment?: boolean;
  }> {
    const user = await this.getUserByEmail(client, email);

    if (!user) {
      return { exists: false };
    }

    return {
      exists: true,
      user,
      hasEstablishment: user.establishment_id != null
    };
  }

  /**
   * Get users by establishment ID with filtering
   * Consolidates establishment user queries
   */
  static async getUsersByEstablishment(
    client: PoolClient | typeof pool,
    establishmentId: string,
    options: {
      role?: string;
      isActive?: boolean;
      search?: string;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {}
  ) {
    const {
      role,
      isActive,
      search,
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    let query = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.is_active,
        u.last_login_at,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.establishment_id = $1
    `;

    const queryParams: Array<string | number | boolean> = [establishmentId];
    let paramCount = 1;

    if (role) {
      paramCount++;
      query += ` AND u.role = $${paramCount}`;
      queryParams.push(role);
    }

    if (isActive !== undefined) {
      paramCount++;
      query += ` AND u.is_active = $${paramCount}`;
      queryParams.push(isActive);
    }

    if (search) {
      paramCount++;
      query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    const validSortFields = ['first_name', 'last_name', 'email', 'role', 'created_at', 'last_login_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    query += ` ORDER BY u.${sortField} ${sortOrder}`;

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
   * Count users by establishment with filters
   */
  static async countUsersByEstablishment(
    client: PoolClient | typeof pool,
    establishmentId: string,
    options: {
      role?: string;
      isActive?: boolean;
      search?: string;
    } = {}
  ): Promise<number> {
    const { role, isActive, search } = options;

    let query = 'SELECT COUNT(*) FROM users u WHERE u.establishment_id = $1';
    const queryParams: Array<string | number | boolean> = [establishmentId];
    let paramCount = 1;

    if (role) {
      paramCount++;
      query += ` AND u.role = $${paramCount}`;
      queryParams.push(role);
    }

    if (isActive !== undefined) {
      paramCount++;
      query += ` AND u.is_active = $${paramCount}`;
      queryParams.push(isActive);
    }

    if (search) {
      paramCount++;
      query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    const result = await client.query(query, queryParams);
    return parseInt(result.rows[0].count);
  }
}
