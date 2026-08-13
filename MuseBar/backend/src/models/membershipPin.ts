import bcrypt from 'bcrypt';
import { pool } from '../db/pool';
import { computeLockoutDurationMinutes, MAX_FAILED_LOGIN_ATTEMPTS } from '../routes/authLogin/config';

export const PIN_MIN_LENGTH = 6;
export const PIN_MAX_LENGTH = 6;
export const PIN_PATTERN = /^\d{6}$/;

export interface MembershipPinRow {
  user_id: number;
  establishment_id: string;
  role: string;
  is_active: boolean;
  pin_hash: string | null;
  pin_failed_attempts: number;
  pin_lockout_count: number;
  pin_locked_until: Date | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

function bcryptRounds(): number {
  const raw = process.env.BCRYPT_ROUNDS;
  const parsed = raw ? Number.parseInt(raw, 10) : 12;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 12;
}

export class MembershipPinModel {
  static isValidPinFormat(pin: string): boolean {
    return PIN_PATTERN.test(pin);
  }

  static async getMembershipWithPin(
    userId: number,
    establishmentId: string
  ): Promise<MembershipPinRow | null> {
    const result = await pool.query(
      `SELECT m.user_id, m.establishment_id, m.role, m.is_active,
              m.pin_hash, m.pin_failed_attempts, m.pin_lockout_count, m.pin_locked_until,
              u.email, u.first_name, u.last_name
       FROM user_establishment_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.user_id = $1 AND m.establishment_id = $2 AND m.is_active = TRUE
         AND COALESCE(u.is_active, TRUE) = TRUE`,
      [userId, establishmentId]
    );
    return (result.rows[0] as MembershipPinRow | undefined) ?? null;
  }

  static async findByPin(
    establishmentId: string,
    pin: string
  ): Promise<MembershipPinRow | null> {
    const result = await pool.query(
      `SELECT m.user_id, m.establishment_id, m.role, m.is_active,
              m.pin_hash, m.pin_failed_attempts, m.pin_lockout_count, m.pin_locked_until,
              u.email, u.first_name, u.last_name
       FROM user_establishment_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.establishment_id = $1
         AND m.is_active = TRUE
         AND m.pin_hash IS NOT NULL
         AND COALESCE(u.is_active, TRUE) = TRUE`,
      [establishmentId]
    );

    for (const row of result.rows as MembershipPinRow[]) {
      if (!row.pin_hash) continue;
      const match = await bcrypt.compare(pin, row.pin_hash);
      if (match) return row;
    }
    return null;
  }

  static async setPin(
    userId: number,
    establishmentId: string,
    pin: string
  ): Promise<void> {
    if (!this.isValidPinFormat(pin)) {
      throw new Error('PIN must be exactly 6 digits');
    }
    const pin_hash = await bcrypt.hash(pin, bcryptRounds());
    const result = await pool.query(
      `UPDATE user_establishment_memberships
       SET pin_hash = $3,
           pin_failed_attempts = 0,
           pin_locked_until = NULL,
           pin_updated_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND establishment_id = $2 AND is_active = TRUE
       RETURNING user_id`,
      [userId, establishmentId, pin_hash]
    );
    if (result.rowCount === 0) {
      throw new Error('Active membership not found');
    }
  }

  static async clearPin(userId: number, establishmentId: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE user_establishment_memberships
       SET pin_hash = NULL,
           pin_failed_attempts = 0,
           pin_locked_until = NULL,
           pin_updated_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND establishment_id = $2
       RETURNING user_id`,
      [userId, establishmentId]
    );
    return (result.rowCount || 0) > 0;
  }

  static async hasPin(userId: number, establishmentId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM user_establishment_memberships
       WHERE user_id = $1 AND establishment_id = $2 AND pin_hash IS NOT NULL`,
      [userId, establishmentId]
    );
    return (result.rowCount || 0) > 0;
  }

  static isLocked(row: Pick<MembershipPinRow, 'pin_locked_until'>): boolean {
    if (!row.pin_locked_until) return false;
    return new Date(row.pin_locked_until).getTime() > Date.now();
  }

  static async recordFailedAttempt(userId: number, establishmentId: string): Promise<{
    failedAttempts: number;
    lockedUntil: Date | null;
  }> {
    const current = await pool.query(
      `SELECT pin_failed_attempts, pin_lockout_count, pin_locked_until
       FROM user_establishment_memberships
       WHERE user_id = $1 AND establishment_id = $2`,
      [userId, establishmentId]
    );
    const row = current.rows[0] as
      | { pin_failed_attempts: number; pin_lockout_count: number; pin_locked_until: Date | null }
      | undefined;
    if (!row) {
      return { failedAttempts: 0, lockedUntil: null };
    }

    const nextFailed = (row.pin_failed_attempts || 0) + 1;
    if (nextFailed >= MAX_FAILED_LOGIN_ATTEMPTS) {
      const nextLockoutCount = (row.pin_lockout_count || 0) + 1;
      const minutes = computeLockoutDurationMinutes(nextLockoutCount);
      const lockedUntil = new Date(Date.now() + minutes * 60 * 1000);
      await pool.query(
        `UPDATE user_establishment_memberships
         SET pin_failed_attempts = $3,
             pin_lockout_count = $4,
             pin_locked_until = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND establishment_id = $2`,
        [userId, establishmentId, nextFailed, nextLockoutCount, lockedUntil]
      );
      return { failedAttempts: nextFailed, lockedUntil };
    }

    await pool.query(
      `UPDATE user_establishment_memberships
       SET pin_failed_attempts = $3, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND establishment_id = $2`,
      [userId, establishmentId, nextFailed]
    );
    return { failedAttempts: nextFailed, lockedUntil: null };
  }

  static async clearLockout(userId: number, establishmentId: string): Promise<void> {
    await pool.query(
      `UPDATE user_establishment_memberships
       SET pin_failed_attempts = 0,
           pin_locked_until = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND establishment_id = $2`,
      [userId, establishmentId]
    );
  }

  /**
   * After a wrong PIN with no matching membership, bump failed attempts on every
   * locked-or-unlocked membership that has a PIN in this establishment is too noisy.
   * Instead callers record failure only when a candidate matched hash but was locked,
   * or we scan all PIN memberships and increment none — verify route handles unknown PIN
   * without attributing to a user (timing-safe-ish via constant bcrypt of dummy hash).
   */
  static async listPinMemberships(establishmentId: string): Promise<MembershipPinRow[]> {
    const result = await pool.query(
      `SELECT m.user_id, m.establishment_id, m.role, m.is_active,
              m.pin_hash, m.pin_failed_attempts, m.pin_lockout_count, m.pin_locked_until,
              u.email, u.first_name, u.last_name
       FROM user_establishment_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.establishment_id = $1
         AND m.is_active = TRUE
         AND m.pin_hash IS NOT NULL
         AND COALESCE(u.is_active, TRUE) = TRUE`,
      [establishmentId]
    );
    return result.rows as MembershipPinRow[];
  }
}
