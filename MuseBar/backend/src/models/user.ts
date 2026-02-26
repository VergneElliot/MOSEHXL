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

  static async setUserPermissions(userId: number, permissions: string[]): Promise<void> {
    // Remove all current permissions
    await pool.query('DELETE FROM user_permissions WHERE user_id = $1', [userId]);
    // Add new permissions
    for (const perm of permissions) {
      const permRes = await pool.query('SELECT id FROM permissions WHERE name = $1', [perm]);
      if (permRes.rows.length > 0) {
        await pool.query('INSERT INTO user_permissions (user_id, permission_id) VALUES ($1, $2)', [userId, permRes.rows[0].id]);
      }
    }
  }
} 