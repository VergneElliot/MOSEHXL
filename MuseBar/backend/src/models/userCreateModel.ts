import { pool } from '../db/pool';
import bcrypt from 'bcrypt';
import type { UserRow } from './userTypes';
import { assertPasswordPolicy } from './userPassword';

export async function createUser(
  email: string,
  password: string,
  is_admin: boolean = false
): Promise<UserRow> {
  await assertPasswordPolicy(password);
  const password_hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, is_admin) VALUES ($1, $2, $3) RETURNING *`,
    [email, password_hash, is_admin]
  );
  return result.rows[0];
}

/** Create a platform system_admin (no establishment). */
export async function createSystemAdmin(input: {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}): Promise<UserRow> {
  await assertPasswordPolicy(input.password);
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

export async function createUserForEstablishment(
  email: string,
  password: string,
  role: string,
  establishmentId: string
): Promise<UserRow> {
  await assertPasswordPolicy(password);
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

export async function updatePasswordById(userId: number, password: string): Promise<boolean> {
  await assertPasswordPolicy(password);
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
export async function bootstrapSystemAdmin(
  email: string,
  password: string
): Promise<{ id: number; email: string; is_admin: boolean }> {
  const existingAdmin = await pool.query('SELECT COUNT(*) FROM users WHERE is_admin = true');
  if (parseInt(existingAdmin.rows[0].count) > 0) {
    throw Object.assign(new Error('Admin user already exists'), { statusCode: 400 });
  }

  const user = await createUser(email, password, true);
  await pool.query(
    `UPDATE users SET first_name = 'System', last_name = 'Administrator', role = 'system_admin', email_verified = true WHERE id = $1`,
    [user.id]
  );

  return { id: user.id, email: user.email, is_admin: user.is_admin };
}
