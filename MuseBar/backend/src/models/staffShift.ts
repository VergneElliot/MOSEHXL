import { pool } from '../db/pool';
import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';

export type ShiftRecurrence = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ShiftApprovalStatus =
  | 'pending_employee'
  | 'confirmed'
  | 'declined'
  | 'pending_admin';

export interface StaffShift {
  id: number;
  establishment_id: string;
  user_id: number;
  starts_at: string;
  ends_at: string;
  label: string | null;
  note: string | null;
  series_id: string | null;
  recurrence: ShiftRecurrence;
  approval_status: ShiftApprovalStatus;
  confirmation_token: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

const OCCURRENCE_COUNTS: Record<ShiftRecurrence, number> = {
  once: 1,
  daily: 30,
  weekly: 26,
  monthly: 12,
  yearly: 5,
};

export function isValidRecurrence(value: string): value is ShiftRecurrence {
  return ['once', 'daily', 'weekly', 'monthly', 'yearly'].includes(value);
}

function addOccurrence(base: Date, recurrence: ShiftRecurrence, index: number): Date {
  const d = new Date(base.getTime());
  if (index === 0) return d;
  switch (recurrence) {
    case 'daily':
      d.setDate(d.getDate() + index);
      break;
    case 'weekly':
      d.setDate(d.getDate() + index * 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + index);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + index);
      break;
    default:
      break;
  }
  return d;
}

async function withRlsBypass<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.bypass_rls', 'on', true)");
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export class StaffShiftModel {
  static async list(
    establishmentId: string,
    opts: { from: string; to: string; userId?: number; includeDeclined?: boolean }
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

  static async getById(establishmentId: string, id: number): Promise<StaffShift | null> {
    const result = await pool.query(
      `SELECT * FROM staff_shifts WHERE establishment_id = $1 AND id = $2`,
      [establishmentId, id]
    );
    return (result.rows[0] as StaffShift) ?? null;
  }

  static async findByConfirmationToken(token: string): Promise<StaffShift[]> {
    return withRlsBypass(async (client) => {
      const result = await client.query(
        `SELECT * FROM staff_shifts
         WHERE confirmation_token = $1::uuid
         ORDER BY starts_at ASC`,
        [token]
      );
      return result.rows as StaffShift[];
    });
  }

  static async create(input: {
    establishment_id: string;
    user_id: number;
    starts_at: string;
    ends_at: string;
    label?: string | null;
    note?: string | null;
    created_by?: number | null;
    series_id?: string | null;
    recurrence?: ShiftRecurrence;
    approval_status?: ShiftApprovalStatus;
    confirmation_token?: string | null;
  }): Promise<StaffShift> {
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

  /**
   * Create one or many shifts for a recurrence rule.
   * New series start as pending_employee with a shared confirmation token.
   */
  static async createSeries(input: {
    establishment_id: string;
    user_id: number;
    starts_at: string;
    ends_at: string;
    label?: string | null;
    note?: string | null;
    created_by?: number | null;
    recurrence?: ShiftRecurrence;
    requireEmployeeConfirmation?: boolean;
  }): Promise<{ shifts: StaffShift[]; series_id: string | null; confirmation_token: string | null }> {
    const recurrence = input.recurrence && isValidRecurrence(input.recurrence)
      ? input.recurrence
      : 'once';
    const count = OCCURRENCE_COUNTS[recurrence];
    const start0 = new Date(input.starts_at);
    const end0 = new Date(input.ends_at);
    const durationMs = end0.getTime() - start0.getTime();
    if (!(durationMs > 0)) {
      throw Object.assign(new Error('ends_at must be after starts_at'), {
        code: 'INVALID_RANGE',
      });
    }

    const seriesId = recurrence === 'once' ? null : randomUUID();
    const requireConfirm = input.requireEmployeeConfirmation !== false;
    const confirmationToken = requireConfirm ? randomUUID() : null;
    const approvalStatus: ShiftApprovalStatus = requireConfirm
      ? 'pending_employee'
      : 'confirmed';

    const shifts: StaffShift[] = [];
    for (let i = 0; i < count; i += 1) {
      const starts = addOccurrence(start0, recurrence, i);
      const ends = new Date(starts.getTime() + durationMs);
      const shift = await this.create({
        establishment_id: input.establishment_id,
        user_id: input.user_id,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        label: input.label ?? null,
        note: input.note ?? null,
        created_by: input.created_by ?? null,
        series_id: seriesId,
        recurrence,
        approval_status: approvalStatus,
        confirmation_token: confirmationToken,
      });
      shifts.push(shift);
    }

    return {
      shifts,
      series_id: seriesId,
      confirmation_token: confirmationToken,
    };
  }

  static async update(
    establishmentId: string,
    id: number,
    patch: Partial<{
      user_id: number;
      starts_at: string;
      ends_at: string;
      label: string | null;
      note: string | null;
      approval_status: ShiftApprovalStatus;
    }>
  ): Promise<StaffShift | null> {
    const existing = await this.getById(establishmentId, id);
    if (!existing) return null;
    const result = await pool.query(
      `UPDATE staff_shifts SET
         user_id = $3,
         starts_at = $4,
         ends_at = $5,
         label = $6,
         note = $7,
         approval_status = $8,
         updated_at = CURRENT_TIMESTAMP
       WHERE establishment_id = $1 AND id = $2
       RETURNING *`,
      [
        establishmentId,
        id,
        patch.user_id ?? existing.user_id,
        patch.starts_at ?? existing.starts_at,
        patch.ends_at ?? existing.ends_at,
        patch.label !== undefined ? patch.label : existing.label,
        patch.note !== undefined ? patch.note : existing.note,
        patch.approval_status ?? existing.approval_status,
      ]
    );
    return (result.rows[0] as StaffShift) ?? null;
  }

  static async setApprovalByToken(
    token: string,
    status: 'confirmed' | 'declined'
  ): Promise<StaffShift[]> {
    return withRlsBypass(async (client) => {
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

  static async delete(establishmentId: string, id: number): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM staff_shifts WHERE establishment_id = $1 AND id = $2`,
      [establishmentId, id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async duplicateWeek(
    establishmentId: string,
    sourceFrom: string,
    sourceTo: string,
    targetFrom: string,
    createdBy?: number | null
  ): Promise<number> {
    const source = await this.list(establishmentId, { from: sourceFrom, to: sourceTo });
    const confirmed = source.filter((s) => s.approval_status === 'confirmed');
    const sourceStart = new Date(sourceFrom).getTime();
    const targetStart = new Date(targetFrom).getTime();
    const delta = targetStart - sourceStart;
    let created = 0;
    for (const shift of confirmed) {
      const starts = new Date(new Date(shift.starts_at).getTime() + delta).toISOString();
      const ends = new Date(new Date(shift.ends_at).getTime() + delta).toISOString();
      await this.create({
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

  static async getOrCreateIcsToken(
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
}
