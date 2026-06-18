import { pool } from '../db/pool';

export type PasswordResetRequestRow = {
  id: string;
  user_id: number;
  email: string;
  reset_token: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
  ip_address: string | null;
  user_agent: string | null;
};

export class PasswordResetRequestModel {
  static async invalidateActiveRequestsForUser(userId: number): Promise<void> {
    await pool.query(
      `UPDATE password_reset_requests
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
         AND used_at IS NULL`,
      [userId]
    );
  }

  static async createRequest(input: {
    userId: number;
    email: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<PasswordResetRequestRow> {
    const result = await pool.query(
      `INSERT INTO password_reset_requests
       (user_id, email, reset_token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.userId,
        input.email,
        input.tokenHash,
        input.expiresAt,
        input.ipAddress ?? null,
        input.userAgent ?? null,
      ]
    );
    return result.rows[0];
  }

  static async findValidByTokenHash(tokenHash: string): Promise<PasswordResetRequestRow | null> {
    const result = await pool.query(
      `SELECT *
       FROM password_reset_requests
       WHERE reset_token = $1
         AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC
       LIMIT 1`,
      [tokenHash]
    );
    return result.rows[0] ?? null;
  }

  static async markUsed(id: string): Promise<void> {
    await pool.query(
      `UPDATE password_reset_requests
       SET used_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
  }
}
