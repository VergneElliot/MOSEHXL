import { pool } from '../db/pool';
import {
  mapTimeEntryRow,
  mapTimeEntryWithUser,
  type TimeEntry,
  type TimeEntryWithUser,
} from './timeEntryTypes';

export async function getOpenTimeEntry(
  establishmentId: string,
  userId: number
): Promise<TimeEntry | null> {
  const result = await pool.query(
    `SELECT * FROM time_entries
       WHERE establishment_id = $1 AND user_id = $2 AND clock_out_at IS NULL
       LIMIT 1`,
    [establishmentId, userId]
  );
  return result.rows[0] ? mapTimeEntryRow(result.rows[0]) : null;
}

export async function getOpenTimeEntryAnyEstablishment(userId: number): Promise<TimeEntry | null> {
  const result = await pool.query(
    `SELECT * FROM time_entries
       WHERE user_id = $1 AND clock_out_at IS NULL
       LIMIT 1`,
    [userId]
  );
  return result.rows[0] ? mapTimeEntryRow(result.rows[0]) : null;
}

export async function getTimeEntryById(
  establishmentId: string,
  id: number
): Promise<TimeEntry | null> {
  const result = await pool.query(
    `SELECT * FROM time_entries WHERE establishment_id = $1 AND id = $2`,
    [establishmentId, id]
  );
  return result.rows[0] ? mapTimeEntryRow(result.rows[0]) : null;
}

export async function listTimeEntries(
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
  return result.rows.map((row) => mapTimeEntryWithUser(row));
}

export async function listCurrentlyClockedIn(
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
  return result.rows.map((row) => mapTimeEntryWithUser(row));
}
