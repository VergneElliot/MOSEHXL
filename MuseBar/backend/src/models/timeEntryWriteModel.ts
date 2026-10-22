import { pool } from '../db/pool';
import { mapTimeEntryRow, type TimeClockSource, type TimeEntry } from './timeEntryTypes';
import { getOpenTimeEntryAnyEstablishment, getTimeEntryById } from './timeEntryReadModel';

export async function clockInTimeEntry(params: {
  establishmentId: string;
  userId: number;
  ip: string | null;
  source: TimeClockSource;
  note?: string | null;
}): Promise<TimeEntry> {
  const existing = await getOpenTimeEntryAnyEstablishment(params.userId);
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
  return mapTimeEntryRow(result.rows[0]);
}

export async function clockOutTimeEntry(params: {
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
  return result.rows[0] ? mapTimeEntryRow(result.rows[0]) : null;
}

export async function adminUpdateTimeEntry(
  establishmentId: string,
  id: number,
  patch: {
    clock_in_at?: string;
    clock_out_at?: string | null;
    note?: string | null;
    adjusted_by: number;
  }
): Promise<TimeEntry | null> {
  const current = await getTimeEntryById(establishmentId, id);
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
  return result.rows[0] ? mapTimeEntryRow(result.rows[0]) : null;
}

export async function deleteTimeEntry(establishmentId: string, id: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM time_entries WHERE establishment_id = $1 AND id = $2`,
    [establishmentId, id]
  );
  return (result.rowCount ?? 0) > 0;
}
