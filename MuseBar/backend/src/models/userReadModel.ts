import { pool } from '../db/pool';
import bcrypt from 'bcrypt';
import type { AuthenticatedUser, UserRow } from './userTypes';

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await pool.query(
    `SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email.trim()]
  );
  return result.rows[0] || null;
}

export async function findUserById(id: number): Promise<UserRow | null> {
  const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

export async function getAuthenticatedUser(id: number): Promise<AuthenticatedUser | null> {
  const result = await pool.query(`
      SELECT id, email, is_admin, COALESCE(role, 'user') as role, establishment_id
      FROM users WHERE id = $1
    `, [id]);
  return result.rows[0] || null;
}

export async function verifyUserPassword(user: UserRow, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.password_hash);
}

export async function listSystemAdmins(): Promise<UserRow[]> {
  const result = await pool.query(
    `SELECT *
       FROM users
       WHERE role = 'system_admin'
         AND establishment_id IS NULL
       ORDER BY created_at ASC, id ASC`
  );
  return result.rows;
}

export async function getAuthLoginDetails(userId: number): Promise<{
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

export async function getAuthRoleState(userId: number): Promise<{
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

export async function getAuthMeProfile(userId: number): Promise<{
  first_name: string | null;
  last_name: string | null;
  email_verified: boolean;
  phone: string | null;
  date_of_birth: string | null;
} | null> {
  const result = await pool.query(
    `SELECT first_name, last_name, email_verified, phone, date_of_birth
       FROM users WHERE id = $1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) return null;
  const dob = row.date_of_birth;
  return {
    first_name: row.first_name,
    last_name: row.last_name,
    email_verified: row.email_verified,
    phone: row.phone ?? null,
    date_of_birth:
      dob instanceof Date
        ? dob.toISOString().slice(0, 10)
        : dob
          ? String(dob).slice(0, 10)
          : null,
  };
}

/**
 * List active users for an establishment (membership-scoped admin view).
 */
export async function listUsersByEstablishment(
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
    calendar_color?: string;
    phone?: string | null;
    date_of_birth?: string | null;
    created_at: Date;
  }>
> {
  const { MembershipModel } = await import('./membership');
  return MembershipModel.listUsersForEstablishment(establishmentId);
}

/**
 * Ownership check: does `userId` have an active membership in `establishmentId`?
 */
export async function userBelongsToEstablishment(
  userId: number,
  establishmentId: string
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM user_establishment_memberships
       WHERE user_id = $1 AND establishment_id = $2 AND is_active = TRUE`,
    [userId, establishmentId]
  );
  return result.rows.length > 0;
}
