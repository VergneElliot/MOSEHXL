import { pool } from '../app';
import bcrypt from 'bcrypt';

/**
 * Full database row from the `users` table.
 * Returned by SELECT * queries. Contains sensitive fields (password_hash)
 * that must NEVER be sent to the frontend.
 */
export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  is_admin: boolean;
  role: string;
  establishment_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email_verified: boolean;
  is_active: boolean;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Subset of user data carried in the JWT and attached to `req.user`.
 * This is the backend's "session" representation -- no DB query needed.
 * Must stay in sync with `types/express/index.d.ts`.
 */
export interface AuthenticatedUser {
  id: number;
  email: string;
  is_admin: boolean;
  role: string;
  establishment_id: string | null;
}

/** @deprecated Use UserRow instead. Alias kept for backward compatibility during migration. */
export type User = UserRow;

export class UserModel {
  static async createUser(email: string, password: string, is_admin: boolean = false): Promise<UserRow> {
    const password_hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, is_admin) VALUES ($1, $2, $3) RETURNING *`,
      [email, password_hash, is_admin]
    );
    return result.rows[0];
  }

  static async createUserForEstablishment(
    email: string,
    password: string,
    role: string,
    establishmentId: string
  ): Promise<UserRow> {
    const password_hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, is_admin, role, establishment_id, email_verified)
       VALUES ($1, $2, false, $3, $4, true) RETURNING *`,
      [email, password_hash, role, establishmentId]
    );
    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<UserRow | null> {
    const result = await pool.query(`
      SELECT * FROM users 
      WHERE email = $1 
      ORDER BY 
        CASE WHEN establishment_id IS NOT NULL THEN 0 ELSE 1 END,
        id DESC
      LIMIT 1
    `, [email]);
    return result.rows[0] || null;
  }

  static async findById(id: number): Promise<UserRow | null> {
    const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  static async getAuthenticatedUser(id: number): Promise<AuthenticatedUser | null> {
    const result = await pool.query(`
      SELECT id, email, is_admin, COALESCE(role, 'user') as role, establishment_id
      FROM users WHERE id = $1
    `, [id]);
    return result.rows[0] || null;
  }

  static async verifyPassword(user: UserRow, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  // Permission management.
  // Returns explicit permissions from user_permissions, falling back to role-based defaults
  // so newly created establishment users always get the correct access without manual seeding.
  static async getUserPermissions(userId: number): Promise<string[]> {
    const result = await pool.query(
      `SELECT p.name FROM permissions p
       JOIN user_permissions up ON up.permission_id = p.id
       WHERE up.user_id = $1`,
      [userId]
    );

    if (result.rows.length > 0) {
      return result.rows.map((row: any) => row.name);
    }

    // No explicit permissions — derive from the user's role.
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    const role: string = userResult.rows[0]?.role || '';

    // Only establishment_admin gets automatic full access.
    // All other roles (cashier, manager, etc.) must have permissions explicitly granted
    // by the establishment admin — no assumptions are made on their behalf.
    if (role === 'establishment_admin') {
      const allPerms = await pool.query('SELECT name FROM permissions');
      return allPerms.rows.map((row: any) => row.name);
    }

    return [];
  }

  /**
   * Replace all permissions for a user in one transaction.
   * Uses a single DELETE plus one INSERT...SELECT (batch) instead of 2N+1 queries.
   */
  static async setUserPermissions(userId: number, permissions: string[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM user_permissions WHERE user_id = $1', [userId]);
      if (permissions.length > 0) {
        await client.query(
          `INSERT INTO user_permissions (user_id, permission_id)
           SELECT $1, p.id FROM permissions p WHERE p.name = ANY($2::text[])`,
          [userId, permissions]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Auth login details used by /api/auth/login and token refresh.
   * Centralizes small read queries so route handlers stay orchestration-only.
   */
  static async getAuthLoginDetails(userId: number): Promise<{
    first_name: string | null;
    last_name: string | null;
    role: string | null;
    establishment_id: string | null;
    is_admin: boolean;
    email_verified: boolean;
  } | null> {
    const result = await pool.query(
      `SELECT first_name, last_name, role, establishment_id, is_admin, email_verified
       FROM users WHERE id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Minimal role/state used by /api/auth/refresh.
   */
  static async getAuthRoleState(userId: number): Promise<{
    role: string | null;
    establishment_id: string | null;
    is_admin: boolean;
  } | null> {
    const result = await pool.query(
      'SELECT role, establishment_id, is_admin FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Lightweight profile fields used by /api/auth/me.
   */
  static async getAuthMeProfile(userId: number): Promise<{
    first_name: string | null;
    last_name: string | null;
    email_verified: boolean;
  } | null> {
    const result = await pool.query(
      'SELECT first_name, last_name, email_verified FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * List users for an establishment (establishment-scoped admin view).
   */
  static async listUsersByEstablishment(
    establishmentId: string
  ): Promise<
    Array<{
      id: number;
      email: string;
      is_admin: boolean;
      role: string;
      establishment_id: string | null;
      first_name: string | null;
      last_name: string | null;
      created_at: Date;
    }>
  > {
    const result = await pool.query(
      'SELECT id, email, is_admin, role, establishment_id, first_name, last_name, created_at FROM users WHERE establishment_id = $1 ORDER BY id',
      [establishmentId]
    );
    return result.rows;
  }

  /**
   * Ownership check: does `userId` belong to `establishmentId`?
   */
  static async userBelongsToEstablishment(userId: number, establishmentId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND establishment_id = $2',
      [userId, establishmentId]
    );
    return result.rows.length > 0;
  }

  /**
   * Delete a user by id.
   * Ownership checks should be performed by callers at the establishment level.
   */
  static async deleteUserById(userId: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Update a user's role.
   * Ownership checks should be performed by callers at the establishment level.
   */
  static async updateUserRoleById(userId: number, role: string): Promise<boolean> {
    const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * One-time system bootstrap: create the first admin user and mark it as system admin.
   * Throws with `statusCode = 400` when an admin already exists.
   */
  static async bootstrapSystemAdmin(
    email: string,
    password: string
  ): Promise<{ id: number; email: string; is_admin: boolean }> {
    const existingAdmin = await pool.query('SELECT COUNT(*) FROM users WHERE is_admin = true');
    if (parseInt(existingAdmin.rows[0].count) > 0) {
      const err: any = new Error('Admin user already exists');
      err.statusCode = 400;
      throw err;
    }

    const user = await UserModel.createUser(email, password, true);
    await pool.query(
      `UPDATE users SET first_name = 'System', last_name = 'Administrator', role = 'system_admin', email_verified = true WHERE id = $1`,
      [user.id]
    );

    return { id: user.id, email: user.email, is_admin: user.is_admin };
  }
} 