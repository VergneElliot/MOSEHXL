/**
 * PostgreSQL-backed rate limit store.
 * Shared across all server processes and survives restarts (audit #40).
 */

import { Pool } from 'pg';
import { IRateLimitStoreAdapter } from './types';

export class PostgresRateLimitStore implements IRateLimitStoreAdapter {
  constructor(private pool: Pool) {}

  async incrementAndGet(
    key: string,
    windowMs: number
  ): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const resetTimeNew = new Date(now + windowMs);

    const result = await this.pool.query<{ count: number; reset_time: Date }>(
      `INSERT INTO rate_limit_store (key, count, reset_time)
       VALUES ($1, 1, $2)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE
           WHEN rate_limit_store.reset_time < NOW() THEN 1
           ELSE rate_limit_store.count + 1
         END,
         reset_time = CASE
           WHEN rate_limit_store.reset_time < NOW() THEN $2
           ELSE rate_limit_store.reset_time
         END
       RETURNING count, reset_time`,
      [key, resetTimeNew]
    );

    const row = result.rows[0];
    const resetTimeMs = row ? new Date(row.reset_time).getTime() : now + windowMs;
    return { count: row?.count ?? 1, resetTime: resetTimeMs };
  }

  async getEntriesForStats(): Promise<Array<{ key: string; count: number; resetTime: number }>> {
    const result = await this.pool.query<{ key: string; count: number; reset_time: Date }>(
      'SELECT key, count, reset_time FROM rate_limit_store ORDER BY count DESC LIMIT 100'
    );
    return result.rows.map((r) => ({
      key: r.key,
      count: r.count,
      resetTime: new Date(r.reset_time).getTime(),
    }));
  }

  async getCount(key: string): Promise<number> {
    const result = await this.pool.query<{ count: number }>(
      'SELECT count FROM rate_limit_store WHERE key = $1',
      [key]
    );
    return result.rows[0]?.count ?? 0;
  }

  async resetKey(key: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM rate_limit_store WHERE key = $1', [key]);
    return (result.rowCount ?? 0) > 0;
  }

  async cleanup(): Promise<void> {
    await this.pool.query('DELETE FROM rate_limit_store WHERE reset_time < NOW()');
  }
}
