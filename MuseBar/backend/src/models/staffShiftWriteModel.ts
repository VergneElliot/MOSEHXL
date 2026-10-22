import { pool } from '../db/pool';
import type { StaffShift, StaffShiftCreateInput, StaffShiftPatch } from './staffShiftTypes';
import { getStaffShiftById, listStaffShifts } from './staffShiftReadModel';
import { STAFF_SHIFT_UPDATE_SQL, staffShiftUpdateValues } from './staffShiftUpdateQuery';
import { withStaffShiftRlsBypass } from './staffShiftRls';

export async function createStaffShift(input: StaffShiftCreateInput): Promise<StaffShift> {
  const result = await pool.query(
    `INSERT INTO staff_shifts (
         establishment_id, user_id, starts_at, ends_at, label, note, created_by,
         series_id, recurrence, approval_status, confirmation_token
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
    [
      input.establishment_id,
      input.user_id,
      input.starts_at,
      input.ends_at,
      input.label ?? null,
      input.note ?? null,
      input.created_by ?? null,
      input.series_id ?? null,
      input.recurrence ?? 'once',
      input.approval_status ?? 'confirmed',
      input.confirmation_token ?? null,
    ]
  );
  return result.rows[0] as StaffShift;
}

export async function updateStaffShift(
  establishmentId: string,
  id: number,
  patch: StaffShiftPatch
): Promise<StaffShift | null> {
  const existing = await getStaffShiftById(establishmentId, id);
  if (!existing) return null;
  const result = await pool.query(
    STAFF_SHIFT_UPDATE_SQL,
    staffShiftUpdateValues(establishmentId, id, patch, existing)
  );
  return (result.rows[0] as StaffShift) ?? null;
}

export async function deleteStaffShift(establishmentId: string, id: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM staff_shifts WHERE establishment_id = $1 AND id = $2`,
    [establishmentId, id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteStaffShiftSeries(
  establishmentId: string,
  seriesId: string
): Promise<number> {
  const result = await pool.query(
    `DELETE FROM staff_shifts
       WHERE establishment_id = $1 AND series_id = $2::uuid`,
    [establishmentId, seriesId]
  );
  return result.rowCount ?? 0;
}

export async function deleteAllStaffShifts(establishmentId: string): Promise<number> {
  const result = await pool.query(
    `DELETE FROM staff_shifts WHERE establishment_id = $1`,
    [establishmentId]
  );
  return result.rowCount ?? 0;
}

/** Copies confirmed shifts of the source window into the target week as standalone shifts. */
export async function duplicateStaffShiftWeek(
  establishmentId: string,
  sourceFrom: string,
  sourceTo: string,
  targetFrom: string,
  createdBy?: number | null
): Promise<number> {
  const source = await listStaffShifts(establishmentId, { from: sourceFrom, to: sourceTo });
  const confirmed = source.filter((s) => s.approval_status === 'confirmed');
  const sourceStart = new Date(sourceFrom).getTime();
  const targetStart = new Date(targetFrom).getTime();
  const delta = targetStart - sourceStart;
  let created = 0;
  for (const shift of confirmed) {
    const starts = new Date(new Date(shift.starts_at).getTime() + delta).toISOString();
    const ends = new Date(new Date(shift.ends_at).getTime() + delta).toISOString();
    await createStaffShift({
      establishment_id: establishmentId,
      user_id: shift.user_id,
      starts_at: starts,
      ends_at: ends,
      label: shift.label,
      note: shift.note,
      created_by: createdBy ?? null,
      series_id: null,
      recurrence: 'once',
      approval_status: 'confirmed',
      confirmation_token: null,
    });
    created += 1;
  }
  return created;
}

export async function updateStaffShiftWithBypass(
  establishmentId: string,
  id: number,
  patch: StaffShiftPatch
): Promise<StaffShift | null> {
  return withStaffShiftRlsBypass(async (client) => {
    const existingRes = await client.query(
      `SELECT * FROM staff_shifts WHERE establishment_id = $1 AND id = $2`,
      [establishmentId, id]
    );
    const existing = existingRes.rows[0] as StaffShift | undefined;
    if (!existing) return null;
    const result = await client.query(
      STAFF_SHIFT_UPDATE_SQL,
      staffShiftUpdateValues(establishmentId, id, patch, existing)
    );
    return (result.rows[0] as StaffShift) ?? null;
  });
}

export async function setStaffShiftApprovalByToken(
  token: string,
  status: 'confirmed' | 'declined'
): Promise<StaffShift[]> {
  return withStaffShiftRlsBypass(async (client) => {
    const result = await client.query(
      `UPDATE staff_shifts
         SET approval_status = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE confirmation_token = $1::uuid
           AND approval_status = 'pending_employee'
         RETURNING *`,
      [token, status]
    );
    return result.rows as StaffShift[];
  });
}

export async function getOrCreateStaffPlanningIcsToken(
  establishmentId: string,
  userId: number
): Promise<string> {
  const existing = await pool.query(
    `SELECT token FROM staff_planning_ics_tokens
       WHERE establishment_id = $1 AND user_id = $2`,
    [establishmentId, userId]
  );
  if (existing.rows[0]?.token) return String(existing.rows[0].token);
  const inserted = await pool.query(
    `INSERT INTO staff_planning_ics_tokens (user_id, establishment_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET establishment_id = EXCLUDED.establishment_id
       RETURNING token`,
    [userId, establishmentId]
  );
  return String(inserted.rows[0].token);
}
