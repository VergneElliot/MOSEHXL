import { pool } from '../db/pool';

export type TimeClockSource = 'self' | 'shared_terminal' | 'admin';

export interface TimeEntry {
  id: number;
  establishment_id: string;
  user_id: number;
  clock_in_at: string;
  clock_out_at: string | null;
  clock_in_ip: string | null;
  clock_out_ip: string | null;
  source: TimeClockSource;
  note: string | null;
  adjusted_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface TimeEntryWithUser extends TimeEntry {
  first_name: string | null;
  last_name: string | null;
  email: string;
}

export interface UserHoursTotal {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  total_ms: number;
  entry_count: number;
}

function mapRow(row: Record<string, unknown>): TimeEntry {
  return {
    id: Number(row.id),
    establishment_id: String(row.establishment_id),
    user_id: Number(row.user_id),
    clock_in_at: new Date(row.clock_in_at as string | Date).toISOString(),
    clock_out_at: row.clock_out_at
      ? new Date(row.clock_out_at as string | Date).toISOString()
      : null,
    clock_in_ip: (row.clock_in_ip as string) ?? null,
    clock_out_ip: (row.clock_out_ip as string) ?? null,
    source: row.source as TimeClockSource,
    note: (row.note as string) ?? null,
    adjusted_by: row.adjusted_by != null ? Number(row.adjusted_by) : null,
    created_at: new Date(row.created_at as string | Date).toISOString(),
    updated_at: new Date(row.updated_at as string | Date).toISOString(),
  };
}

export class TimeEntryModel {
  static async getOpenEntry(
    establishmentId: string,
    userId: number
  ): Promise<TimeEntry | null> {
    const result = await pool.query(
      `SELECT * FROM time_entries
       WHERE establishment_id = $1 AND user_id = $2 AND clock_out_at IS NULL
       LIMIT 1`,
      [establishmentId, userId]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  static async getOpenEntryAnyEstablishment(userId: number): Promise<TimeEntry | null> {
    const result = await pool.query(
      `SELECT * FROM time_entries
       WHERE user_id = $1 AND clock_out_at IS NULL
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  static async clockIn(params: {
    establishmentId: string;
    userId: number;
    ip: string | null;
    source: TimeClockSource;
    note?: string | null;
  }): Promise<TimeEntry> {
    const existing = await this.getOpenEntryAnyEstablishment(params.userId);
    if (existing) {
      const err = new Error('Un pointage est déjà ouvert pour cet utilisateur');
      (err as Error & { code?: string }).code = 'TIME_ENTRY_ALREADY_OPEN';
      throw err;
    }

    const result = await pool.query(
      `INSERT INTO time_entries (
         establishment_id, user_id, clock_in_at, clock_in_ip, source, note
       ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5)
       RETURNING *`,
      [
        params.establishmentId,
        params.userId,
        params.ip,
        params.source,
        params.note?.trim() || null,
      ]
    );
    return mapRow(result.rows[0]);
  }

  static async clockOut(params: {
    establishmentId: string;
    userId: number;
    ip: string | null;
  }): Promise<TimeEntry | null> {
    const result = await pool.query(
      `UPDATE time_entries
       SET clock_out_at = CURRENT_TIMESTAMP,
           clock_out_ip = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE establishment_id = $1
         AND user_id = $2
         AND clock_out_at IS NULL
       RETURNING *`,
      [params.establishmentId, params.userId, params.ip]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  static async getById(
    establishmentId: string,
    id: number
  ): Promise<TimeEntry | null> {
    const result = await pool.query(
      `SELECT * FROM time_entries WHERE establishment_id = $1 AND id = $2`,
      [establishmentId, id]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  static async list(
    establishmentId: string,
    opts: { from: string; to: string; userId?: number }
  ): Promise<TimeEntryWithUser[]> {
    const params: unknown[] = [establishmentId, opts.from, opts.to];
    let userClause = '';
    if (opts.userId != null && Number.isFinite(opts.userId)) {
      params.push(opts.userId);
      userClause = `AND te.user_id = $${params.length}`;
    }
    const result = await pool.query(
      `SELECT te.*, u.first_name, u.last_name, u.email
       FROM time_entries te
       JOIN users u ON u.id = te.user_id
       WHERE te.establishment_id = $1
         AND te.clock_in_at < $3::timestamptz
         AND (te.clock_out_at IS NULL OR te.clock_out_at > $2::timestamptz)
         ${userClause}
       ORDER BY te.clock_in_at DESC`,
      params
    );
    return result.rows.map((row) => ({
      ...mapRow(row),
      first_name: row.first_name ?? null,
      last_name: row.last_name ?? null,
      email: String(row.email),
    }));
  }

  static async totalsByUser(
    establishmentId: string,
    opts: { from: string; to: string; userId?: number }
  ): Promise<UserHoursTotal[]> {
    const entries = await this.list(establishmentId, opts);
    const fromMs = new Date(opts.from).getTime();
    const toMs = new Date(opts.to).getTime();
    const map = new Map<number, UserHoursTotal>();

    for (const entry of entries) {
      const start = Math.max(new Date(entry.clock_in_at).getTime(), fromMs);
      const endRaw = entry.clock_out_at
        ? new Date(entry.clock_out_at).getTime()
        : Date.now();
      const end = Math.min(endRaw, toMs);
      const duration = Math.max(0, end - start);
      const existing = map.get(entry.user_id);
      if (existing) {
        existing.total_ms += duration;
        existing.entry_count += 1;
      } else {
        map.set(entry.user_id, {
          user_id: entry.user_id,
          first_name: entry.first_name,
          last_name: entry.last_name,
          email: entry.email,
          total_ms: duration,
          entry_count: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      `${a.last_name || ''}${a.first_name || ''}`.localeCompare(
        `${b.last_name || ''}${b.first_name || ''}`,
        'fr'
      )
    );
  }

  static async adminUpdate(
    establishmentId: string,
    id: number,
    patch: {
      clock_in_at?: string;
      clock_out_at?: string | null;
      note?: string | null;
      adjusted_by: number;
    }
  ): Promise<TimeEntry | null> {
    const current = await this.getById(establishmentId, id);
    if (!current) return null;

    const clockIn = patch.clock_in_at ?? current.clock_in_at;
    const clockOut =
      patch.clock_out_at !== undefined ? patch.clock_out_at : current.clock_out_at;
    if (clockOut && new Date(clockOut).getTime() <= new Date(clockIn).getTime()) {
      const err = new Error('clock_out_at must be after clock_in_at');
      (err as Error & { code?: string }).code = 'TIME_ENTRY_INVALID_RANGE';
      throw err;
    }

    const result = await pool.query(
      `UPDATE time_entries
       SET clock_in_at = $3::timestamptz,
           clock_out_at = $4::timestamptz,
           note = COALESCE($5, note),
           adjusted_by = $6,
           source = 'admin',
           updated_at = CURRENT_TIMESTAMP
       WHERE establishment_id = $1 AND id = $2
       RETURNING *`,
      [
        establishmentId,
        id,
        clockIn,
        clockOut,
        patch.note !== undefined ? patch.note : null,
        patch.adjusted_by,
      ]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  static async delete(establishmentId: string, id: number): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM time_entries WHERE establishment_id = $1 AND id = $2`,
      [establishmentId, id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async listCurrentlyClockedIn(
    establishmentId: string
  ): Promise<TimeEntryWithUser[]> {
    const result = await pool.query(
      `SELECT te.*, u.first_name, u.last_name, u.email
       FROM time_entries te
       JOIN users u ON u.id = te.user_id
       WHERE te.establishment_id = $1 AND te.clock_out_at IS NULL
       ORDER BY te.clock_in_at ASC`,
      [establishmentId]
    );
    return result.rows.map((row) => ({
      ...mapRow(row),
      first_name: row.first_name ?? null,
      last_name: row.last_name ?? null,
      email: String(row.email),
    }));
  }
}

export {
  normalizeAllowedIps,
  isValidIpOrCidr,
  isIpAllowed,
  ipv6HostToPrefixCidr,
} from './timeClockIpAllowlist';
export {
  TimeClockNetworkSettingsModel,
  type TimeClockNetworkSettings,
} from './timeClockNetworkSettings';
