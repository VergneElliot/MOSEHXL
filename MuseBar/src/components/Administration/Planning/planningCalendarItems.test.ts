import { describe, expect, it } from 'vitest';
import type { StaffLeaveDto } from '../../../services/api/adminSpace';
import { buildPlanningCalendarItems } from './planningCalendarItems';
import type { DisplayShift, PlanningStaffMember } from './planningTypes';

const staff: PlanningStaffMember[] = [
  { id: 1, email: 'a@b.c', first_name: 'Ann', last_name: 'Bee', calendar_color: '#abcdef' },
];

function shift(partial: Partial<DisplayShift> & Pick<DisplayShift, 'id'>): DisplayShift {
  return {
    user_id: 1,
    starts_at: '2026-10-14T08:00:00.000Z',
    ends_at: '2026-10-14T12:00:00.000Z',
    label: 'Midi',
    note: null,
    series_id: null,
    recurrence: 'once',
    approval_status: 'confirmed',
    ...partial,
  };
}

function leave(partial: Partial<StaffLeaveDto> & Pick<StaffLeaveDto, 'id'>): StaffLeaveDto {
  return {
    user_id: 1,
    leave_type: 'paid_leave',
    starts_on: '2026-10-20',
    ends_on: '2026-10-22',
    half_day_start: false,
    half_day_end: false,
    note: null,
    review_note: null,
    status: 'approved',
    ...partial,
  };
}

describe('buildPlanningCalendarItems', () => {
  it('maps confirmed shifts with staff color', () => {
    const items = buildPlanningCalendarItems([shift({ id: 1 })], [], staff);
    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.id).toBe(1);
    expect(item.title).toContain('Ann Bee');
    expect(item.title).toContain('Midi');
    expect(item.color).toBe('#abcdef');
    expect(item.subtitle).toBe('Midi');
  });

  it('marks pending draft shifts orange', () => {
    const items = buildPlanningCalendarItems(
      [shift({ id: 2, _draft: true, approval_status: 'pending_employee' })],
      [],
      staff
    );
    const item = items[0]!;
    expect(item.color).toBe('#ED6C02');
    expect(item.title).toContain('(en attente)');
    expect(item.subtitle).toBe('Modification non enregistrée');
  });

  it('includes approved/pending leaves and skips others', () => {
    const items = buildPlanningCalendarItems(
      [],
      [
        leave({ id: 10, status: 'approved', note: 'Vacances' }),
        leave({ id: 11, status: 'pending', leave_type: 'rtt' }),
        leave({ id: 12, status: 'rejected' }),
      ],
      staff
    );
    expect(items).toHaveLength(2);
    const first = items[0]!;
    const second = items[1]!;
    expect(first.id).toBe('leave-10');
    expect(first.title).toContain('Congés payés');
    expect(first.subtitle).toBe('Vacances');
    expect(first.color).toBe('#2e7d32');
    expect(second.id).toBe('leave-11');
    expect(second.title).toContain('(demande)');
    expect(second.color).toBe('#9c27b0');
  });
});
