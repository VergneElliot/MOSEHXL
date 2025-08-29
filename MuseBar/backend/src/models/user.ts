import { pool } from '../app';
import bcrypt from 'bcrypt';

export interface User {
  id: number;
  email: string;
  password_hash?: string;
  password?: string;  // Support both column names
  is_admin: boolean;
  created_at: Date;
}

export class UserModel {
  static async createUser(email: string, password: string, is_admin: boolean = false): Promise<User> {
    const password_hash = await bcrypt.hash(password, 12);
    
    // First check which column exists
    const columnCheckResult = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'users' AND column_name IN ('password', 'password_hash') LIMIT 1`
    );
    
    const passwordColumn = columnCheckResult.rows[0]?.column_name || 'password';
    
    const result = await pool.query(
      `INSERT INTO users (email, ${passwordColumn}, is_admin) VALUES ($1, $2, $3) RETURNING *`,
      [email, password_hash, is_admin]
    );
    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    return result.rows[0] || null;
  }

  static async findById(id: number): Promise<User | null> {
    const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    // Support both password_hash and password column names
    const hashedPassword = user.password_hash || user.password;
    if (!hashedPassword) return false;
    return bcrypt.compare(password, hashedPassword);
  }

  // Permission management
  static async getUserPermissions(userId: number): Promise<string[]> {
    const result = await pool.query(
      `SELECT p.name FROM permissions p
       JOIN user_permissions up ON up.permission_id = p.id
       WHERE up.user_id = $1`,
      [userId]
    );
    return result.rows.map((row: any) => row.name);
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