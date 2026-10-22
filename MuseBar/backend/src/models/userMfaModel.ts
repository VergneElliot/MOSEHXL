import { pool } from '../db/pool';

export async function getMfaTotpState(userId: number): Promise<{
  mfa_totp_enabled: boolean;
  mfa_totp_secret: string | null;
} | null> {
  const result = await pool.query(
    'SELECT mfa_totp_enabled, mfa_totp_secret FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

export async function setMfaTotpSecret(userId: number, secret: string): Promise<void> {
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

export async function enableMfaTotp(userId: number): Promise<void> {
  await pool.query(
    `UPDATE users
       SET mfa_totp_enabled = true,
           mfa_totp_enabled_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
    [userId]
  );
}

export async function disableMfaTotp(userId: number): Promise<void> {
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
