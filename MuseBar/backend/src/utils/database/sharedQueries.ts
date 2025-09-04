/**
 * Shared Database Queries
 * Consolidated database queries to eliminate duplication across services
 */

import { PoolClient } from 'pg';
import { pool } from '../../app';

/**
 * User-related shared queries
 */
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
    user?: any;
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
    
    const queryParams: any[] = [establishmentId];
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

    // Add sorting
    const validSortFields = ['first_name', 'last_name', 'email', 'role', 'created_at', 'last_login_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    query += ` ORDER BY u.${sortField} ${sortOrder}`;

    // Add pagination
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
    const queryParams: any[] = [establishmentId];
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

/**
 * Establishment-related shared queries
 */
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
    
    const queryParams: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` WHERE status = $${paramCount}`;
      queryParams.push(status);
    }

    // Add sorting
    const validSortFields = ['name', 'email', 'status', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    query += ` ORDER BY ${sortField} ${sortOrder}`;

    // Add pagination
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
    const queryParams: any[] = [establishmentId, status];
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

/**
 * Invitation-related shared queries
 */
export class InvitationQueries {
  
  /**
   * Get invitations by establishment
   */
  static async getInvitationsByEstablishment(
    client: PoolClient | typeof pool,
    establishmentId: string,
    options: {
      status?: string;
      limit?: number;
      sortOrder?: 'ASC' | 'DESC';
    } = {}
  ) {
    const { status, limit, sortOrder = 'DESC' } = options;

    let query = `
      SELECT email, role, status, created_at, expires_at
      FROM user_invitations 
      WHERE establishment_id = $1
    `;
    
    const queryParams: any[] = [establishmentId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      queryParams.push(status);
    }

    query += ` ORDER BY created_at ${sortOrder}`;

    if (limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      queryParams.push(limit);
    }

    const result = await client.query(query, queryParams);
    return result.rows;
  }

  /**
   * Get invitation by token
   */
  static async getInvitationByToken(
    client: PoolClient | typeof pool,
    token: string
  ) {
    const result = await client.query(`
      SELECT ui.*, e.id as establishment_id, e.name as establishment_name, e.email as establishment_email
      FROM user_invitations ui
      LEFT JOIN establishments e ON ui.establishment_id = e.id
      WHERE ui.invitation_token = $1 
        AND ui.status = 'pending'
        AND ui.expires_at > CURRENT_TIMESTAMP
    `, [token]);

    return result.rows[0] || null;
  }
}
