import type { StaffLeaveDto, StaffShiftDto } from '../../../services/api/adminSpace';
import { addDays, toLocalDateInputValue } from '../AdminMonthCalendar';
import { utcToParisDateTimeLocal } from '../../../utils/formatDate';

export type PlanningStaffMember = {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  calendar_color?: string;
};

export type ShiftRecurrence = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ApplyTo = 'one' | 'series';
export type SeriesScopeAction = 'save' | 'delete';

export type ShiftForm = {
  id?: number;
  user_id: number;
  starts_at: string;
  ends_at: string;
  label: string;
  recurrence: ShiftRecurrence;
  series_id?: string | null;
};

export type LeaveForm = {
  user_id: number;
  leave_type: StaffLeaveDto['leave_type'];
  starts_on: string;
  ends_on: string;
  half_day_start: boolean;
  half_day_end: boolean;
  note: string;
};

export type DisplayShift = StaffShiftDto & { _draft?: boolean };

export const LEAVE_TYPE_LABELS: Record<string, string> = {
  paid_leave: 'Congés payés',
  rtt: 'RTT',
  sick_leave: 'Maladie',
  unpaid_leave: 'Sans solde',
  family_event: 'Événement familial',
  other: 'Autre',
};

export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

export function todayYmd(): string {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

function normalizeRecurrence(value: string | undefined): ShiftRecurrence {
  return value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'yearly'
    ? value
    : 'once';
}

export function shiftToForm(shift: StaffShiftDto): ShiftForm {
  return {
    id: shift.id,
    user_id: shift.user_id,
    starts_at: utcToParisDateTimeLocal(shift.starts_at),
    ends_at: utcToParisDateTimeLocal(shift.ends_at),
    label: shift.label || '',
    recurrence: normalizeRecurrence(shift.recurrence),
    series_id: shift.series_id ?? null,
  };
}

export function newShiftForm(userId: number, day: Date): ShiftForm {
  return {
    user_id: userId,
    starts_at: toLocalDateInputValue(day, 10, 0),
    ends_at: toLocalDateInputValue(day, 18, 0),
    label: '',
    recurrence: 'once',
    series_id: null,
  };
}

export function isPendingShift(shift: DisplayShift): boolean {
  return shift.approval_status === 'pending_employee' || Boolean(shift._draft);
}

export function nameOfStaff(staff: PlanningStaffMember[], id: number): string {
  const u = staff.find((s) => s.id === id);
  if (!u) return `#${id}`;
  const n = `${u.first_name || ''} ${u.last_name || ''}`.trim();
  return n || u.email;
}

export function colorOfStaff(staff: PlanningStaffMember[], id: number): string {
  const u = staff.find((s) => s.id === id);
  return u?.calendar_color || '#1565C0';
}

export function shiftsForDay(
  displayShifts: DisplayShift[],
  userId: number,
  day: Date
): DisplayShift[] {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = addDays(dayStart, 1);
  return displayShifts.filter((s) => {
    if (s.user_id !== userId) return false;
    const start = new Date(s.starts_at);
    return start >= dayStart && start < dayEnd;
  });
}

export function emptyLeaveForm(userId: number): LeaveForm {
  const d = todayYmd();
  return {
    user_id: userId,
    leave_type: 'paid_leave',
    starts_on: d,
    ends_on: d,
    half_day_start: false,
    half_day_end: false,
    note: '',
  };
}
