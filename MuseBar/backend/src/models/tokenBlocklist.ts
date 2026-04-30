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
    if (result.rows.length > 0) {
      return true;
    }

    const decoded = jwt.decode(token);
    const decodedPayload = decoded && typeof decoded === 'object' ? decoded as jwt.JwtPayload : null;
    const userId = typeof decodedPayload?.id === 'number' ? decodedPayload.id : null;
    const iat = typeof decodedPayload?.iat === 'number' ? decodedPayload.iat : null;

    if (userId === null || iat === null) {
      return false;
    }

    const cutoffResult = await pool.query(
      `SELECT revoke_before_iat
       FROM user_token_revocation_cutoffs
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (cutoffResult.rows.length === 0) {
      return false;
    }

    const revokeBeforeIat = Number(cutoffResult.rows[0].revoke_before_iat);
    return Number.isFinite(revokeBeforeIat) && iat < revokeBeforeIat;
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

  static async revokeAllUserTokensIssuedBefore(
    userId: number,
    revokeBeforeIat: number,
    reason: string = 'MANUAL_GLOBAL_REVOKE'
  ): Promise<void> {
    await pool.query(
      `INSERT INTO user_token_revocation_cutoffs (user_id, revoke_before_iat, reason, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE
       SET
         revoke_before_iat = GREATEST(
           user_token_revocation_cutoffs.revoke_before_iat,
           EXCLUDED.revoke_before_iat
         ),
         reason = EXCLUDED.reason,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, revokeBeforeIat, reason]
    );
  }
}
