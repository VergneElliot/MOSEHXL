import { pool } from '../db/pool';
import bcrypt from 'bcrypt';
import { validatePasswordWithBreachCheck } from '../utils/passwordValidation';

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
  failed_login_attempts: number;
  lockout_count: number;
  locked_until: Date | null;
  mfa_totp_enabled?: boolean;
  mfa_totp_secret?: string | null;
  mfa_totp_enabled_at?: Date | null;
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
  private static async assertPasswordPolicy(password: string): Promise<void> {
    const passwordValidation = await validatePasswordWithBreachCheck(password);
    if (!passwordValidation.isValid) {
      throw Object.assign(
        new Error(passwordValidation.error ?? 'Invalid password'),
        { statusCode: 400 }
      );
    }
  }

  private static getEstablishmentAdminPermissionMode(): 'implicit_all' | 'explicit_only' {
    const raw = process.env.ESTABLISHMENT_ADMIN_PERMISSION_MODE?.trim().toLowerCase();
    if (raw === 'explicit_only') return 'explicit_only';
    if (raw === 'implicit_all') return 'implicit_all';
    return process.env.NODE_ENV?.trim().toLowerCase() === 'production'
      ? 'explicit_only'
      : 'implicit_all';
  }

  static async createUser(email: string, password: string, is_admin: boolean = false): Promise<UserRow> {
    await this.assertPasswordPolicy(password);
    const password_hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, is_admin) VALUES ($1, $2, $3) RETURNING *`,
      [email, password_hash, is_admin]
    );
    return result.rows[0];
  }

  /** Create a platform system_admin (no establishment). */
  static async createSystemAdmin(input: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }): Promise<UserRow> {
    await this.assertPasswordPolicy(input.password);
    const password_hash = await bcrypt.hash(input.password, 12);
    const result = await pool.query(
      `INSERT INTO users (
         email, password_hash, is_admin, role, establishment_id,
         first_name, last_name, email_verified, is_active
       ) VALUES ($1, $2, true, 'system_admin', NULL, $3, $4, true, true)
       RETURNING *`,
      [
        input.email,
        password_hash,
        input.first_name?.trim() || null,
        input.last_name?.trim() || null,
      ]
    );
    return result.rows[0];
  }

  static async listSystemAdmins(): Promise<UserRow[]> {
    const result = await pool.query(
      `SELECT *
       FROM users
       WHERE role = 'system_admin'
         AND establishment_id IS NULL
       ORDER BY created_at ASC, id ASC`
    );
    return result.rows;
  }

  static async setSystemAdminActive(userId: number, isActive: boolean): Promise<UserRow | null> {
    const result = await pool.query(
      `UPDATE users
       SET is_active = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND role = 'system_admin'
         AND establishment_id IS NULL
       RETURNING *`,
      [userId, isActive]
    );
    return result.rows[0] || null;
  }

  static async createUserForEstablishment(
    email: string,
    password: string,
    role: string,
    establishmentId: string
  ): Promise<UserRow> {
    await this.assertPasswordPolicy(password);
    const password_hash = await bcrypt.hash(password, 12);
    const normalizedEmail = email.toLowerCase().trim();
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, is_admin, role, establishment_id, email_verified)
       VALUES ($1, $2, false, $3, $4, true) RETURNING *`,
      [normalizedEmail, password_hash, role, establishmentId]
    );
    const user = result.rows[0] as UserRow;
    const { MembershipModel } = await import('./membership');
    await MembershipModel.upsert({
      user_id: user.id,
      establishment_id: establishmentId,
      role: role as 'establishment_admin' | 'staff',
    });
    return user;
  }

  static async findByEmail(email: string): Promise<UserRow | null> {
    const result = await pool.query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email.trim()]
    );
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

  static async incrementFailedLoginAttempts(userId: number): Promise<number> {
    const result = await pool.query(
      `UPDATE users
       SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING failed_login_attempts`,
      [userId]
    );
    return Number(result.rows[0]?.failed_login_attempts ?? 0);
  }

  static async applyLoginLockout(userId: number, lockedUntil: Date): Promise<number> {
    const result = await pool.query(
      `UPDATE users
       SET locked_until = $2,
           lockout_count = COALESCE(lockout_count, 0) + 1,
           failed_login_attempts = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING lockout_count`,
      [userId, lockedUntil]
    );
    return Number(result.rows[0]?.lockout_count ?? 0);
  }

  static async clearLoginLockoutState(userId: number): Promise<void> {
    await pool.query(
      `UPDATE users
       SET failed_login_attempts = 0,
           locked_until = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );
  }

  static async getMfaTotpState(userId: number): Promise<{
    mfa_totp_enabled: boolean;
    mfa_totp_secret: string | null;
  } | null> {
    const result = await pool.query(
      'SELECT mfa_totp_enabled, mfa_totp_secret FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  static async setMfaTotpSecret(userId: number, secret: string): Promise<void> {
    await pool.query(
      `UPDATE users
       SET mfa_totp_secret = $2,
           mfa_totp_enabled = false,
           mfa_totp_enabled_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId, secret]
    );
  }

  static async enableMfaTotp(userId: number): Promise<void> {
    await pool.query(
      `UPDATE users
       SET mfa_totp_enabled = true,
           mfa_totp_enabled_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );
  }

  static async disableMfaTotp(userId: number): Promise<void> {
    await pool.query(
      `UPDATE users
       SET mfa_totp_enabled = false,
           mfa_totp_secret = NULL,
           mfa_totp_enabled_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );
  }

  static async unlockUserAccount(userId: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE users
       SET failed_login_attempts = 0,
           lockout_count = 0,
           locked_until = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Permission management (venue-scoped via establishmentId).
  // When establishmentId is omitted, uses users.establishment_id (active context).
  static async getUserPermissions(
    userId: number,
    establishmentId?: string | null
  ): Promise<string[]> {
    const userResult = await pool.query(
      'SELECT role, establishment_id FROM users WHERE id = $1',
      [userId]
    );
    const userRow = userResult.rows[0] as { role?: string; establishment_id?: string | null } | undefined;
    if (!userRow) return [];

    // Resolve membership role when an establishment context is available.
    let role = userRow.role || '';
    const activeEstablishmentId = establishmentId ?? userRow.establishment_id ?? null;
    if (activeEstablishmentId && role !== 'system_admin') {
      const mem = await pool.query(
        `SELECT role FROM user_establishment_memberships
         WHERE user_id = $1 AND establishment_id = $2 AND is_active = TRUE`,
        [userId, activeEstablishmentId]
      );
      if (mem.rows[0]?.role) role = String(mem.rows[0].role);
    }

    const establishmentAdminPermissionMode = this.getEstablishmentAdminPermissionMode();

    if (role === 'establishment_admin' && establishmentAdminPermissionMode === 'implicit_all') {
      const allPerms = await pool.query('SELECT name FROM permissions');
      return allPerms.rows.map((row) => (row as { name: string }).name);
    }

    if (!activeEstablishmentId) {
      return [];
    }

    const result = await pool.query(
      `SELECT p.name FROM permissions p
       JOIN user_permissions up ON up.permission_id = p.id
       WHERE up.user_id = $1 AND up.establishment_id = $2`,
      [userId, activeEstablishmentId]
    );

    return result.rows.map((row) => (row as { name: string }).name);
  }

  /**
   * Replace all permissions for a user in one establishment.
   */
  static async setUserPermissions(
    userId: number,
    permissions: string[],
    establishmentId?: string | null
  ): Promise<void> {
    let estId = establishmentId;
    if (!estId) {
      const u = await pool.query('SELECT establishment_id FROM users WHERE id = $1', [userId]);
      estId = u.rows[0]?.establishment_id ?? null;
    }
    if (!estId) {
      throw Object.assign(new Error('establishment_id required to set permissions'), {
        statusCode: 400,
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'DELETE FROM user_permissions WHERE user_id = $1 AND establishment_id = $2',
        [userId, estId]
      );
      if (permissions.length > 0) {
        await client.query(
          `INSERT INTO user_permissions (user_id, permission_id, establishment_id)
           SELECT $1, p.id, $3 FROM permissions p WHERE p.name = ANY($2::text[])`,
          [userId, permissions, estId]
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
   * List users for an establishment (membership-scoped admin view).
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
    const { MembershipModel } = await import('./membership');
    return MembershipModel.listUsersForEstablishment(establishmentId);
  }

  /**
   * Ownership check: does `userId` have an active membership in `establishmentId`?
   */
  static async userBelongsToEstablishment(userId: number, establishmentId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM user_establishment_memberships
       WHERE user_id = $1 AND establishment_id = $2 AND is_active = TRUE`,
      [userId, establishmentId]
    );
    return result.rows.length > 0;
  }

  /**
   * Delete a user by id.
   * Prefer MembershipModel.remove for establishment-scoped removal.
   */
  static async deleteUserById(userId: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Update a user's role for one establishment (membership + users cache when active).
   */
  static async updateUserRoleById(
    userId: number,
    role: string,
    establishmentId?: string | null
  ): Promise<boolean> {
    if (establishmentId) {
      const { MembershipModel } = await import('./membership');
      await MembershipModel.upsert({
        user_id: userId,
        establishment_id: establishmentId,
        role: role as 'establishment_admin' | 'staff',
      });
      const active = await pool.query(
        'SELECT establishment_id FROM users WHERE id = $1',
        [userId]
      );
      if (active.rows[0]?.establishment_id === establishmentId) {
        await MembershipModel.setActiveEstablishment(
          userId,
          establishmentId,
          role as 'establishment_admin' | 'staff'
        );
      }
      return true;
    }
    const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  static async updatePasswordById(userId: number, password: string): Promise<boolean> {
    await this.assertPasswordPolicy(password);
    const password_hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [password_hash, userId]
    );
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
      throw Object.assign(new Error('Admin user already exists'), { statusCode: 400 });
    }

    const user = await UserModel.createUser(email, password, true);
    await pool.query(
      `UPDATE users SET first_name = 'System', last_name = 'Administrator', role = 'system_admin', email_verified = true WHERE id = $1`,
      [user.id]
    );

    return { id: user.id, email: user.email, is_admin: user.is_admin };
  }
} 