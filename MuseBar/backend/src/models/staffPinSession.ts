import { pool } from '../db/pool';

/** One badge-in on a terminal: a PIN identity opened from a logged-in account. */
export interface StaffPinSessionRow {
  id: string;
  establishment_id: string;
  user_id: number;
  opened_by_user_id: number;
  opened_at: Date;
  last_seen_at: Date;
  expires_at: Date;
  closed_at: Date | null;
  close_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface ActivePinSessionSummary {
  id: string;
  user_id: number;
  display_name: string;
  email: string;
  opened_by_user_id: number;
  opened_by_email: string;
  opened_at: Date;
  last_seen_at: Date;
  expires_at: Date;
}

/**
 * A badge with no activity for this long is treated as abandoned on the terminal. The liveness
 * touch is throttled to 5 minutes, so the effective window is this value plus up to 5 minutes.
 */
export const PIN_SESSION_IDLE_TIMEOUT_MS = 60 * 60 * 1000;

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;

/** `ip_address` is an inet column: anything that is not an address must be NULL. */
function toInetOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  const candidate = raw.startsWith('::ffff:') ? raw.slice(7) : raw;
  if (IPV4.test(candidate)) return candidate;
  if (/^[0-9a-fA-F:]+$/.test(raw) && raw.includes(':')) return raw;
  return null;
}

export class StaffPinSessionModel {
  static async open(input: {
    establishmentId: string;
    userId: number;
    openedByUserId: number;
    expiresAt: Date;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
  }): Promise<StaffPinSessionRow> {
    const result = await pool.query(
      `INSERT INTO staff_pin_sessions
         (establishment_id, user_id, opened_by_user_id, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.establishmentId,
        input.userId,
        input.openedByUserId,
        input.expiresAt,
        toInetOrNull(input.ipAddress),
        input.userAgent ?? null,
      ]
    );
    return result.rows[0] as StaffPinSessionRow;
  }

  /** Null when the session is unknown, closed, expired, idle or from another establishment. */
  static async findActive(
    sessionId: string,
    establishmentId: string
  ): Promise<StaffPinSessionRow | null> {
    const result = await pool.query(
      `SELECT * FROM staff_pin_sessions
       WHERE id = $1 AND establishment_id = $2
         AND closed_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
         AND last_seen_at > CURRENT_TIMESTAMP - ($3::bigint * interval '1 millisecond')`,
      [sessionId, establishmentId, PIN_SESSION_IDLE_TIMEOUT_MS]
    );
    return (result.rows[0] as StaffPinSessionRow | undefined) ?? null;
  }

  /**
   * Marks idle and time-expired badges closed. Access control does not depend on this (the
   * queries already exclude them); it keeps the sessions list and the audit reason honest.
   */
  static async closeStale(establishmentId?: string): Promise<number> {
    const scoped = establishmentId != null;
    const result = await pool.query(
      `UPDATE staff_pin_sessions
       SET closed_at = CURRENT_TIMESTAMP,
           close_reason = CASE
             WHEN expires_at <= CURRENT_TIMESTAMP THEN 'expired'
             ELSE 'idle_timeout'
           END
       WHERE closed_at IS NULL
         AND (
           expires_at <= CURRENT_TIMESTAMP
           OR last_seen_at <= CURRENT_TIMESTAMP - ($1::bigint * interval '1 millisecond')
         )
         ${scoped ? 'AND establishment_id = $2' : ''}`,
      scoped ? [PIN_SESSION_IDLE_TIMEOUT_MS, establishmentId] : [PIN_SESSION_IDLE_TIMEOUT_MS]
    );
    return result.rowCount ?? 0;
  }

  /** Closes every open badge of one establishment, e.g. at the daily closure. */
  static async closeAllForEstablishment(
    establishmentId: string,
    reason: string
  ): Promise<number> {
    const result = await pool.query(
      `UPDATE staff_pin_sessions
       SET closed_at = CURRENT_TIMESTAMP, close_reason = $2
       WHERE establishment_id = $1 AND closed_at IS NULL`,
      [establishmentId, reason]
    );
    return result.rowCount ?? 0;
  }

  static async touch(sessionId: string, establishmentId: string): Promise<void> {
    await pool.query(
      `UPDATE staff_pin_sessions
       SET last_seen_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND establishment_id = $2 AND closed_at IS NULL`,
      [sessionId, establishmentId]
    );
  }

  static async close(
    sessionId: string,
    establishmentId: string,
    reason: string
  ): Promise<boolean> {
    const result = await pool.query(
      `UPDATE staff_pin_sessions
       SET closed_at = CURRENT_TIMESTAMP, close_reason = $3
       WHERE id = $1 AND establishment_id = $2 AND closed_at IS NULL`,
      [sessionId, establishmentId, reason]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Closes every open badge of one user, e.g. when their PIN or access changes. */
  static async closeAllForUser(
    userId: number,
    establishmentId: string,
    reason: string
  ): Promise<number> {
    const result = await pool.query(
      `UPDATE staff_pin_sessions
       SET closed_at = CURRENT_TIMESTAMP, close_reason = $3
       WHERE user_id = $1 AND establishment_id = $2 AND closed_at IS NULL`,
      [userId, establishmentId, reason]
    );
    return result.rowCount ?? 0;
  }

  static async listActive(establishmentId: string): Promise<ActivePinSessionSummary[]> {
    const result = await pool.query(
      `SELECT s.id,
              s.user_id,
              u.email,
              TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS full_name,
              s.opened_by_user_id,
              o.email AS opened_by_email,
              s.opened_at,
              s.last_seen_at,
              s.expires_at
       FROM staff_pin_sessions s
       JOIN users u ON u.id = s.user_id
       JOIN users o ON o.id = s.opened_by_user_id
       WHERE s.establishment_id = $1
         AND s.closed_at IS NULL
         AND s.expires_at > CURRENT_TIMESTAMP
         AND s.last_seen_at > CURRENT_TIMESTAMP - ($2::bigint * interval '1 millisecond')
       ORDER BY s.last_seen_at DESC`,
      [establishmentId, PIN_SESSION_IDLE_TIMEOUT_MS]
    );

    return result.rows.map((row) => {
      const r = row as {
        id: string;
        user_id: number;
        email: string;
        full_name: string | null;
        opened_by_user_id: number;
        opened_by_email: string;
        opened_at: Date;
        last_seen_at: Date;
        expires_at: Date;
      };
      return {
        id: r.id,
        user_id: r.user_id,
        display_name: r.full_name?.trim() ? r.full_name.trim() : r.email,
        email: r.email,
        opened_by_user_id: r.opened_by_user_id,
        opened_by_email: r.opened_by_email,
        opened_at: r.opened_at,
        last_seen_at: r.last_seen_at,
        expires_at: r.expires_at,
      };
    });
  }
}
