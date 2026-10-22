import { randomUUID } from 'crypto';
import type {
  ShiftApprovalStatus,
  ShiftRecurrence,
  StaffShift,
  StaffShiftSeriesPatch,
} from './staffShiftTypes';
import {
  applySeriesTimeDelta,
  invalidRangeError,
  isValidRecurrence,
} from './staffShiftTypes';
import { getStaffShiftById, listStaffShiftsBySeries } from './staffShiftReadModel';
import { createStaffShift, updateStaffShift } from './staffShiftWriteModel';

const OCCURRENCE_COUNTS: Record<ShiftRecurrence, number> = {
  once: 1,
  daily: 30,
  weekly: 26,
  monthly: 12,
  yearly: 5,
};

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

/**
 * Create one or many shifts for a recurrence rule.
 * New series start as pending_employee with a shared confirmation token.
 */
export async function createStaffShiftSeries(input: {
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
    throw invalidRangeError();
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
    const shift = await createStaffShift({
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

/**
 * Apply an edit of one occurrence to every shift in the same series.
 * Time changes are relative: siblings keep their calendar spacing.
 */
export async function updateStaffShiftSeriesFromAnchor(
  establishmentId: string,
  anchorId: number,
  patch: StaffShiftSeriesPatch
): Promise<{ updated: StaffShift[]; series_id: string }> {
  const anchor = await getStaffShiftById(establishmentId, anchorId);
  if (!anchor) {
    throw Object.assign(new Error('Shift not found'), { code: 'NOT_FOUND' });
  }
  if (!anchor.series_id) {
    const single = await updateStaffShift(establishmentId, anchorId, patch);
    return { updated: single ? [single] : [], series_id: '' };
  }

  const siblings = await listStaffShiftsBySeries(establishmentId, anchor.series_id);
  const newStartsAt = patch.starts_at ?? anchor.starts_at;
  const newEndsAt = patch.ends_at ?? anchor.ends_at;

  const updated: StaffShift[] = [];
  for (const shift of siblings) {
    const times = applySeriesTimeDelta({
      siblingStartsAt: shift.starts_at,
      siblingEndsAt: shift.ends_at,
      anchorOldStartsAt: anchor.starts_at,
      anchorOldEndsAt: anchor.ends_at,
      anchorNewStartsAt: newStartsAt,
      anchorNewEndsAt: newEndsAt,
    });
    const row = await updateStaffShift(establishmentId, shift.id, {
      user_id: patch.user_id,
      starts_at: times.starts_at,
      ends_at: times.ends_at,
      label: patch.label,
      note: patch.note,
    });
    if (row) updated.push(row);
  }
  return { updated, series_id: anchor.series_id };
}
