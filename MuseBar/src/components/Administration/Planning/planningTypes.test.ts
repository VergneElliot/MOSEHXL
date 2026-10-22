import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StaffShiftDto } from '../../../services/api/adminSpace';
import {
  colorOfStaff,
  emptyLeaveForm,
  isPendingShift,
  nameOfStaff,
  newShiftForm,
  shiftToForm,
  shiftsForDay,
  startOfWeek,
  todayYmd,
  type DisplayShift,
  type PlanningStaffMember,
} from './planningTypes';

const staff: PlanningStaffMember[] = [
  { id: 1, email: 'a@b.c', first_name: 'Ann', last_name: 'Bee', calendar_color: '#111111' },
  { id: 2, email: 'c@d.e', first_name: null, last_name: null },
];

function shift(partial: Partial<DisplayShift> & Pick<DisplayShift, 'id' | 'user_id'>): DisplayShift {
  return {
    starts_at: '2026-10-14T08:00:00.000Z',
    ends_at: '2026-10-14T12:00:00.000Z',
    label: null,
    note: null,
    series_id: null,
    recurrence: 'once',
    approval_status: 'confirmed',
    ...partial,
  };
}

describe('planningTypes helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 14, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('startOfWeek / todayYmd', () => {
    const monday = startOfWeek(new Date(2026, 9, 14));
    expect(monday.getDay()).toBe(1);
    expect(todayYmd()).toBe('2026-10-14');
  });

  it('nameOfStaff / colorOfStaff', () => {
    expect(nameOfStaff(staff, 1)).toBe('Ann Bee');
    expect(nameOfStaff(staff, 2)).toBe('c@d.e');
    expect(nameOfStaff(staff, 99)).toBe('#99');
    expect(colorOfStaff(staff, 1)).toBe('#111111');
    expect(colorOfStaff(staff, 2)).toBe('#1565C0');
  });

  it('isPendingShift', () => {
    expect(isPendingShift(shift({ id: 1, user_id: 1, approval_status: 'confirmed' }))).toBe(
      false
    );
    expect(
      isPendingShift(shift({ id: 2, user_id: 1, approval_status: 'pending_employee' }))
    ).toBe(true);
    expect(isPendingShift(shift({ id: 3, user_id: 1, _draft: true }))).toBe(true);
  });

  it('shiftToForm / newShiftForm / emptyLeaveForm', () => {
    const dto = {
      id: 5,
      user_id: 1,
      starts_at: '2026-10-14T08:00:00.000Z',
      ends_at: '2026-10-14T16:00:00.000Z',
      label: 'Service',
      recurrence: 'weekly',
      series_id: 'ser-1',
    } as StaffShiftDto;
    const form = shiftToForm(dto);
    expect(form.id).toBe(5);
    expect(form.user_id).toBe(1);
    expect(form.label).toBe('Service');
    expect(form.recurrence).toBe('weekly');
    expect(form.series_id).toBe('ser-1');
    expect(form.starts_at).toContain('T');

    const created = newShiftForm(3, new Date(2026, 9, 15));
    expect(created.user_id).toBe(3);
    expect(created.recurrence).toBe('once');
    expect(created.starts_at).toContain('10:00');
    expect(created.ends_at).toContain('18:00');

    const leave = emptyLeaveForm(4);
    expect(leave).toMatchObject({
      user_id: 4,
      leave_type: 'paid_leave',
      starts_on: '2026-10-14',
      ends_on: '2026-10-14',
      half_day_start: false,
      half_day_end: false,
      note: '',
    });
  });

  it('shiftsForDay filters by user and local day', () => {
    const day = new Date(2026, 9, 14);
    const list = [
      shift({ id: 1, user_id: 1, starts_at: '2026-10-14T10:00:00.000Z' }),
      shift({ id: 2, user_id: 1, starts_at: '2026-10-15T10:00:00.000Z' }),
      shift({ id: 3, user_id: 2, starts_at: '2026-10-14T10:00:00.000Z' }),
    ];
    expect(shiftsForDay(list, 1, day).map((s) => s.id)).toEqual([1]);
  });
});
