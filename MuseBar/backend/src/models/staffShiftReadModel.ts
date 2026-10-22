import { pool } from '../db/pool';
import type { StaffShift } from './staffShiftTypes';
import { withStaffShiftRlsBypass } from './staffShiftRls';

export interface StaffShiftListOptions {
  from: string;
  to: string;
  userId?: number;
  includeDeclined?: boolean;
}

export async function listStaffShifts(
  establishmentId: string,
  opts: StaffShiftListOptions
): Promise<StaffShift[]> {
  const conditions = [
    'establishment_id = $1',
    'starts_at < $3::timestamptz',
    'ends_at > $2::timestamptz',
  ];
  const values: unknown[] = [establishmentId, opts.from, opts.to];
  if (!opts.includeDeclined) {
    conditions.push(`approval_status <> 'declined'`);
  }
  if (opts.userId != null) {
    values.push(opts.userId);
    conditions.push(`user_id = $${values.length}`);
  }
  const result = await pool.query(
    `SELECT * FROM staff_shifts WHERE ${conditions.join(' AND ')} ORDER BY starts_at ASC`,
    values
  );
  return result.rows as StaffShift[];
}

export async function getStaffShiftById(
  establishmentId: string,
  id: number
): Promise<StaffShift | null> {
  const result = await pool.query(
    `SELECT * FROM staff_shifts WHERE establishment_id = $1 AND id = $2`,
    [establishmentId, id]
  );
  return (result.rows[0] as StaffShift) ?? null;
}

export async function listStaffShiftsBySeries(
  establishmentId: string,
  seriesId: string
): Promise<StaffShift[]> {
  const result = await pool.query(
    `SELECT * FROM staff_shifts
       WHERE establishment_id = $1 AND series_id = $2::uuid
       ORDER BY starts_at ASC`,
    [establishmentId, seriesId]
  );
  return result.rows as StaffShift[];
}

export async function findStaffShiftsByConfirmationToken(token: string): Promise<StaffShift[]> {
  return withStaffShiftRlsBypass(async (client) => {
    const result = await client.query(
      `SELECT * FROM staff_shifts
         WHERE confirmation_token = $1::uuid
         ORDER BY starts_at ASC`,
      [token]
    );
    return result.rows as StaffShift[];
  });
}
