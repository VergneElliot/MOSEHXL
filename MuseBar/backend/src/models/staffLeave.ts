import { pool } from '../db/pool';
import { countLeaveDaysForPayrollWithCap } from '../services/labor/payrollCalculations';
import { resolvePayrollSettings } from '../services/labor/payrollSettingsResolver';

export type LeaveType =
  | 'paid_leave'
  | 'rtt'
  | 'sick_leave'
  | 'unpaid_leave'
  | 'family_event'
  | 'other';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface StaffLeaveRequest {
  id: number;
  establishment_id: string;
  user_id: number;
  leave_type: LeaveType;
  starts_on: string;
  ends_on: string;
  half_day_start: boolean;
  half_day_end: boolean;
  status: LeaveStatus;
  note: string | null;
  review_note: string | null;
  requested_by: number | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffLeaveWithUser extends StaffLeaveRequest {
  first_name: string | null;
  last_name: string | null;
  email: string;
}

export interface LeaveBalanceRow {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  year: number;
  paid_leave_days: number;
  rtt_days: number;
  used_paid_leave: number;
  used_rtt: number;
  remaining_paid_leave: number;
  remaining_rtt: number;
}

const LEAVE_TYPES: LeaveType[] = [
  'paid_leave',
  'rtt',
  'sick_leave',
  'unpaid_leave',
  'family_event',
  'other',
];

export function isValidLeaveType(value: string): value is LeaveType {
  return LEAVE_TYPES.includes(value as LeaveType);
}

export function isValidLeaveStatus(value: string): value is LeaveStatus {
  return ['pending', 'approved', 'rejected', 'cancelled'].includes(value);
}

function mapRow(row: Record<string, unknown>): StaffLeaveRequest {
  return {
    id: Number(row.id),
    establishment_id: String(row.establishment_id),
    user_id: Number(row.user_id),
    leave_type: row.leave_type as LeaveType,
    starts_on: String(row.starts_on).slice(0, 10),
    ends_on: String(row.ends_on).slice(0, 10),
    half_day_start: Boolean(row.half_day_start),
    half_day_end: Boolean(row.half_day_end),
    status: row.status as LeaveStatus,
    note: (row.note as string) ?? null,
    review_note: (row.review_note as string) ?? null,
    requested_by: row.requested_by != null ? Number(row.requested_by) : null,
    reviewed_by: row.reviewed_by != null ? Number(row.reviewed_by) : null,
    reviewed_at: row.reviewed_at
      ? new Date(row.reviewed_at as string | Date).toISOString()
      : null,
    created_at: new Date(row.created_at as string | Date).toISOString(),
    updated_at: new Date(row.updated_at as string | Date).toISOString(),
  };
}

export class StaffLeaveModel {
  static async list(
    establishmentId: string,
    opts: { from?: string; to?: string; userId?: number; status?: LeaveStatus }
  ): Promise<StaffLeaveWithUser[]> {
    const conditions = ['slr.establishment_id = $1'];
    const params: unknown[] = [establishmentId];

    if (opts.from && opts.to) {
      params.push(opts.from.slice(0, 10), opts.to.slice(0, 10));
      conditions.push(`slr.ends_on >= $${params.length - 1}::date`);
      conditions.push(`slr.starts_on <= $${params.length}::date`);
    }
    if (opts.userId != null) {
      params.push(opts.userId);
      conditions.push(`slr.user_id = $${params.length}`);
    }
    if (opts.status) {
      params.push(opts.status);
      conditions.push(`slr.status = $${params.length}`);
    }

    const result = await pool.query(
      `SELECT slr.*, u.first_name, u.last_name, u.email
       FROM staff_leave_requests slr
       JOIN users u ON u.id = slr.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY slr.starts_on ASC, slr.id ASC`,
      params
    );
    return result.rows.map((row) => ({
      ...mapRow(row),
      first_name: row.first_name ?? null,
      last_name: row.last_name ?? null,
      email: String(row.email),
    }));
  }

  static async getById(
    establishmentId: string,
    id: number
  ): Promise<StaffLeaveRequest | null> {
    const result = await pool.query(
      `SELECT * FROM staff_leave_requests WHERE establishment_id = $1 AND id = $2`,
      [establishmentId, id]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  static async create(params: {
    establishment_id: string;
    user_id: number;
    leave_type: LeaveType;
    starts_on: string;
    ends_on: string;
    half_day_start?: boolean;
    half_day_end?: boolean;
    note?: string | null;
    requested_by: number | null;
  }): Promise<StaffLeaveRequest> {
    const result = await pool.query(
      `INSERT INTO staff_leave_requests (
         establishment_id, user_id, leave_type, starts_on, ends_on,
         half_day_start, half_day_end, note, requested_by
       ) VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, $8, $9)
       RETURNING *`,
      [
        params.establishment_id,
        params.user_id,
        params.leave_type,
        params.starts_on.slice(0, 10),
        params.ends_on.slice(0, 10),
        params.half_day_start ?? false,
        params.half_day_end ?? false,
        params.note?.trim() || null,
        params.requested_by,
      ]
    );
    return mapRow(result.rows[0]);
  }

  static async updateStatus(
    establishmentId: string,
    id: number,
    patch: {
      status: LeaveStatus;
      reviewed_by: number;
      review_note?: string | null;
    }
  ): Promise<StaffLeaveRequest | null> {
    const result = await pool.query(
      `UPDATE staff_leave_requests
       SET status = $3,
           reviewed_by = $4,
           review_note = COALESCE($5, review_note),
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE establishment_id = $1 AND id = $2
       RETURNING *`,
      [
        establishmentId,
        id,
        patch.status,
        patch.reviewed_by,
        patch.review_note !== undefined ? patch.review_note : null,
      ]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  static async listApprovedForRange(
    establishmentId: string,
    from: string,
    to: string
  ): Promise<StaffLeaveRequest[]> {
    const rows = await this.list(establishmentId, {
      from,
      to,
      status: 'approved',
    });
    return rows;
  }

  static async upsertEntitlement(params: {
    establishment_id: string;
    user_id: number;
    year: number;
    paid_leave_days?: number;
    rtt_days?: number;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO staff_leave_entitlements (
         establishment_id, user_id, year, paid_leave_days, rtt_days
       ) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (establishment_id, user_id, year)
       DO UPDATE SET
         paid_leave_days = COALESCE(EXCLUDED.paid_leave_days, staff_leave_entitlements.paid_leave_days),
         rtt_days = COALESCE(EXCLUDED.rtt_days, staff_leave_entitlements.rtt_days),
         updated_at = CURRENT_TIMESTAMP`,
      [
        params.establishment_id,
        params.user_id,
        params.year,
        params.paid_leave_days ?? 25,
        params.rtt_days ?? 0,
      ]
    );
  }

  static async getBalances(
    establishmentId: string,
    year: number
  ): Promise<LeaveBalanceRow[]> {
    const users = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email
       FROM users u
       JOIN user_establishment_memberships m ON m.user_id = u.id
       WHERE m.establishment_id = $1 AND u.is_active = TRUE
       ORDER BY u.last_name NULLS LAST, u.first_name NULLS LAST`,
      [establishmentId]
    );

    const entitlements = await pool.query(
      `SELECT user_id, paid_leave_days, rtt_days
       FROM staff_leave_entitlements
       WHERE establishment_id = $1 AND year = $2`,
      [establishmentId, year]
    );
    const entMap = new Map(
      entitlements.rows.map((r) => [
        Number(r.user_id),
        {
          paid: Number(r.paid_leave_days),
          rtt: Number(r.rtt_days),
        },
      ])
    );

    const approved = await this.list(establishmentId, {
      from: `${year}-01-01`,
      to: `${year}-12-31`,
      status: 'approved',
    });

    const payrollSettings = await resolvePayrollSettings(establishmentId, { years: [year] });

    const usedPaid = new Map<number, number>();
    const usedRtt = new Map<number, number>();
    for (const leave of approved) {
      const { counted_days } = countLeaveDaysForPayrollWithCap(leave, payrollSettings);
      if (leave.leave_type === 'paid_leave') {
        usedPaid.set(leave.user_id, (usedPaid.get(leave.user_id) ?? 0) + counted_days);
      } else if (leave.leave_type === 'rtt') {
        usedRtt.set(leave.user_id, (usedRtt.get(leave.user_id) ?? 0) + counted_days);
      }
    }

    return users.rows.map((u) => {
      const userId = Number(u.id);
      const ent = entMap.get(userId) ?? { paid: 25, rtt: 0 };
      const up = usedPaid.get(userId) ?? 0;
      const ur = usedRtt.get(userId) ?? 0;
      return {
        user_id: userId,
        first_name: u.first_name ?? null,
        last_name: u.last_name ?? null,
        email: String(u.email),
        year,
        paid_leave_days: ent.paid,
        rtt_days: ent.rtt,
        used_paid_leave: up,
        used_rtt: ur,
        remaining_paid_leave: Math.max(0, ent.paid - up),
        remaining_rtt: Math.max(0, ent.rtt - ur),
      };
    });
  }
}
