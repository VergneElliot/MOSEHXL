import { pool } from '../db/pool';
import type { UserRow } from './userTypes';
import { getAuthMeProfile } from './userReadModel';

export async function incrementFailedLoginAttempts(userId: number): Promise<number> {
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

export async function applyLoginLockout(userId: number, lockedUntil: Date): Promise<number> {
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

export async function clearLoginLockoutState(userId: number): Promise<void> {
  await pool.query(
    `UPDATE users
       SET failed_login_attempts = 0,
           locked_until = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
    [userId]
  );
}

export async function unlockUserAccount(userId: number): Promise<boolean> {
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

export async function updatePersonalProfile(
  userId: number,
  patch: Partial<{
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    date_of_birth: string | null;
  }>
): Promise<{
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
}> {
  const existing = await getAuthMeProfile(userId);
  if (!existing) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  const firstName =
    patch.first_name !== undefined
      ? patch.first_name?.trim() || null
      : existing.first_name;
  const lastName =
    patch.last_name !== undefined ? patch.last_name?.trim() || null : existing.last_name;
  const phone =
    patch.phone !== undefined ? patch.phone?.trim() || null : existing.phone;
  const dob =
    patch.date_of_birth !== undefined
      ? patch.date_of_birth?.trim() || null
      : existing.date_of_birth;

  await pool.query(
    `UPDATE users
       SET first_name = $2,
           last_name = $3,
           phone = $4,
           date_of_birth = $5::date,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
    [userId, firstName, lastName, phone, dob]
  );
  return {
    first_name: firstName,
    last_name: lastName,
    phone,
    date_of_birth: dob,
  };
}

/**
 * Delete a user by id.
 * Prefer MembershipModel.remove for establishment-scoped removal.
 */
export async function deleteUserById(userId: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Update a user's role for one establishment (membership + users cache when active).
 */
export async function updateUserRoleById(
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

export async function setSystemAdminActive(
  userId: number,
  isActive: boolean
): Promise<UserRow | null> {
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
