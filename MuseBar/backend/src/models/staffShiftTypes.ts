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
  decline_reason?: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface StaffShiftCreateInput {
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
}

export type StaffShiftPatch = Partial<{
  user_id: number;
  starts_at: string;
  ends_at: string;
  label: string | null;
  note: string | null;
  approval_status: ShiftApprovalStatus;
  confirmation_token: string | null;
  decline_reason: string | null;
}>;

export type StaffShiftSeriesPatch = Partial<{
  user_id: number;
  starts_at: string;
  ends_at: string;
  label: string | null;
  note: string | null;
}>;

export function isValidRecurrence(value: string): value is ShiftRecurrence {
  return ['once', 'daily', 'weekly', 'monthly', 'yearly'].includes(value);
}

export function invalidRangeError(): Error {
  return Object.assign(new Error('ends_at must be after starts_at'), {
    code: 'INVALID_RANGE',
  });
}

/** Pure helper: apply anchor edit delta to one sibling occurrence. */
export function applySeriesTimeDelta(opts: {
  siblingStartsAt: string;
  siblingEndsAt: string;
  anchorOldStartsAt: string;
  anchorOldEndsAt: string;
  anchorNewStartsAt: string;
  anchorNewEndsAt: string;
}): { starts_at: string; ends_at: string } {
  const oldStartMs = new Date(opts.anchorOldStartsAt).getTime();
  const newStartMs = new Date(opts.anchorNewStartsAt).getTime();
  const newEndMs = new Date(opts.anchorNewEndsAt).getTime();
  if (!(newEndMs > newStartMs)) {
    throw invalidRangeError();
  }
  const deltaMs = newStartMs - oldStartMs;
  const durationMs = newEndMs - newStartMs;
  const starts = new Date(new Date(opts.siblingStartsAt).getTime() + deltaMs);
  const ends = new Date(starts.getTime() + durationMs);
  return { starts_at: starts.toISOString(), ends_at: ends.toISOString() };
}
