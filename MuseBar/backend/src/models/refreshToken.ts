import crypto from 'crypto';
import { pool } from '../db/pool';

type CreateRefreshTokenInput = {
  userId: number;
  token: string;
  familyId?: string;
  expiresAt: Date;
  ipAddress?: string;
  ipSubnet?: string;
  userAgent?: string;
  clientId?: string;
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
  ip_address: string | null;
  ip_subnet: string | null;
  user_agent: string | null;
  client_id: string | null;
};

export class RefreshTokenModel {
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async create(input: CreateRefreshTokenInput): Promise<{ id: string; familyId: string }> {
    const tokenHash = this.hashToken(input.token);
    const result = await pool.query(
      `INSERT INTO auth_refresh_tokens
       (user_id, token_hash, family_id, expires_at, ip_address, ip_subnet, user_agent, client_id)
       VALUES ($1, $2, COALESCE($3::uuid, gen_random_uuid()), $4, $5, $6, $7, $8)
       RETURNING id, family_id`,
      [
        input.userId,
        tokenHash,
        input.familyId ?? null,
        input.expiresAt,
        input.ipAddress ?? null,
        input.ipSubnet ?? null,
        input.userAgent ?? null,
        input.clientId ?? null,
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
      ipSubnet?: string;
      userAgent?: string;
      clientId?: string;
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
         (user_id, token_hash, family_id, expires_at, ip_address, ip_subnet, user_agent, client_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          opts.userId,
          nextHash,
          opts.familyId,
          opts.expiresAt,
          opts.ipAddress ?? null,
          opts.ipSubnet ?? null,
          opts.userAgent ?? null,
          opts.clientId ?? null,
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

  static async listActiveSessionsByUser(userId: number): Promise<Array<{
    id: string;
    familyId: string;
    issuedAt: Date;
    expiresAt: Date;
    ipAddress: string | null;
    ipSubnet: string | null;
    userAgent: string | null;
    clientId: string | null;
  }>> {
    const result = await pool.query(
      `SELECT id, family_id, issued_at, expires_at, ip_address, ip_subnet, user_agent, client_id
       FROM auth_refresh_tokens
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       ORDER BY issued_at DESC`,
      [userId]
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      familyId: String(row.family_id),
      issuedAt: new Date(row.issued_at),
      expiresAt: new Date(row.expires_at),
      ipAddress: row.ip_address ? String(row.ip_address) : null,
      ipSubnet: row.ip_subnet ? String(row.ip_subnet) : null,
      userAgent: row.user_agent ? String(row.user_agent) : null,
      clientId: row.client_id ? String(row.client_id) : null,
    }));
  }

  static async revokeAllForUserExceptFamily(
    userId: number,
    familyId: string,
    reason: string
  ): Promise<number> {
    const result = await pool.query(
      `UPDATE auth_refresh_tokens
       SET revoked_at = CURRENT_TIMESTAMP,
           revoke_reason = $3
       WHERE user_id = $1
         AND family_id <> $2
         AND revoked_at IS NULL`,
      [userId, familyId, reason]
    );
    return Number(result.rowCount ?? 0);
  }
}
