import crypto from 'crypto';
import { pool } from '../db/pool';

type CreateRefreshTokenInput = {
  userId: number;
  token: string;
  familyId?: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
};

type RefreshTokenRow = {
  id: string;
  user_id: number;
  token_hash: string;
  family_id: string;
  issued_at: Date;
  expires_at: Date;
  rotated_at: Date | null;
  revoked_at: Date | null;
  revoke_reason: string | null;
  replaced_by_token_hash: string | null;
};

export class RefreshTokenModel {
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async create(input: CreateRefreshTokenInput): Promise<{ id: string; familyId: string }> {
    const tokenHash = this.hashToken(input.token);
    const result = await pool.query(
      `INSERT INTO auth_refresh_tokens
       (user_id, token_hash, family_id, expires_at, ip_address, user_agent)
       VALUES ($1, $2, COALESCE($3::uuid, gen_random_uuid()), $4, $5, $6)
       RETURNING id, family_id`,
      [
        input.userId,
        tokenHash,
        input.familyId ?? null,
        input.expiresAt,
        input.ipAddress ?? null,
        input.userAgent ?? null,
      ]
    );

    return {
      id: String(result.rows[0].id),
      familyId: String(result.rows[0].family_id),
    };
  }

  static async findActiveByRawToken(token: string): Promise<RefreshTokenRow | null> {
    const tokenHash = this.hashToken(token);
    const result = await pool.query(
      `SELECT *
       FROM auth_refresh_tokens
       WHERE token_hash = $1
         AND revoked_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       LIMIT 1`,
      [tokenHash]
    );
    return result.rows[0] ?? null;
  }

  static async rotate(
    currentToken: string,
    nextToken: string,
    opts: {
      userId: number;
      familyId: string;
      expiresAt: Date;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    const currentHash = this.hashToken(currentToken);
    const nextHash = this.hashToken(nextToken);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const updateResult = await client.query(
        `UPDATE auth_refresh_tokens
         SET rotated_at = CURRENT_TIMESTAMP,
             revoked_at = CURRENT_TIMESTAMP,
             revoke_reason = 'ROTATED',
             replaced_by_token_hash = $2
         WHERE token_hash = $1
           AND revoked_at IS NULL
           AND expires_at > CURRENT_TIMESTAMP`,
        [currentHash, nextHash]
      );
      if (updateResult.rowCount !== 1) {
        throw new Error('REFRESH_TOKEN_ALREADY_USED_OR_EXPIRED');
      }

      await client.query(
        `INSERT INTO auth_refresh_tokens
         (user_id, token_hash, family_id, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          opts.userId,
          nextHash,
          opts.familyId,
          opts.expiresAt,
          opts.ipAddress ?? null,
          opts.userAgent ?? null,
        ]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getFamilyIssuedAt(familyId: string): Promise<Date | null> {
    const result = await pool.query(
      `SELECT MIN(issued_at) AS first_issued_at
       FROM auth_refresh_tokens
       WHERE family_id = $1`,
      [familyId]
    );
    const raw = result.rows[0]?.first_issued_at;
    return raw ? new Date(raw) : null;
  }

  static async revokeByRawToken(token: string, reason: string): Promise<void> {
    await pool.query(
      `UPDATE auth_refresh_tokens
       SET revoked_at = CURRENT_TIMESTAMP,
           revoke_reason = $2
       WHERE token_hash = $1
         AND revoked_at IS NULL`,
      [this.hashToken(token), reason]
    );
  }

  static async revokeAllForUser(userId: number, reason: string): Promise<void> {
    await pool.query(
      `UPDATE auth_refresh_tokens
       SET revoked_at = CURRENT_TIMESTAMP,
           revoke_reason = $2
       WHERE user_id = $1
         AND revoked_at IS NULL`,
      [userId, reason]
    );
  }

  static async revokeFamily(familyId: string, reason: string): Promise<void> {
    await pool.query(
      `UPDATE auth_refresh_tokens
       SET revoked_at = CURRENT_TIMESTAMP,
           revoke_reason = $2
       WHERE family_id = $1
         AND revoked_at IS NULL`,
      [familyId, reason]
    );
  }
}
