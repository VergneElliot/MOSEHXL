import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../app';

export class TokenBlocklistModel {
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async isTokenRevoked(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const result = await pool.query(
      `SELECT 1
       FROM token_blocklist
       WHERE token_hash = $1
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
       LIMIT 1`,
      [tokenHash]
    );
    return result.rows.length > 0;
  }

  static async revokeToken(
    token: string,
    options?: {
      userId?: number;
      reason?: string;
    }
  ): Promise<void> {
    const tokenHash = this.hashToken(token);
    const decoded = jwt.decode(token);
    const expiresAt =
      decoded && typeof decoded === 'object' && typeof (decoded as jwt.JwtPayload).exp === 'number'
        ? new Date((decoded as jwt.JwtPayload).exp! * 1000)
        : null;

    await pool.query(
      `INSERT INTO token_blocklist (token_hash, user_id, reason, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (token_hash)
       DO UPDATE
       SET
         user_id = COALESCE(EXCLUDED.user_id, token_blocklist.user_id),
         reason = EXCLUDED.reason,
         expires_at = COALESCE(EXCLUDED.expires_at, token_blocklist.expires_at)`,
      [
        tokenHash,
        options?.userId ?? null,
        options?.reason ?? 'MANUAL',
        expiresAt,
      ]
    );
  }
}
