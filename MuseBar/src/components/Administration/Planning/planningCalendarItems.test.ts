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
    expect(items[0].id).toBe(1);
    expect(items[0].title).toContain('Ann Bee');
    expect(items[0].title).toContain('Midi');
    expect(items[0].color).toBe('#abcdef');
    expect(items[0].subtitle).toBe('Midi');
  });

  it('marks pending draft shifts orange', () => {
    const items = buildPlanningCalendarItems(
      [shift({ id: 2, _draft: true, approval_status: 'pending_employee' })],
      [],
      staff
    );
    expect(items[0].color).toBe('#ED6C02');
    expect(items[0].title).toContain('(en attente)');
    expect(items[0].subtitle).toBe('Modification non enregistrée');
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
    expect(items[0].id).toBe('leave-10');
    expect(items[0].title).toContain('Congés payés');
    expect(items[0].subtitle).toBe('Vacances');
    expect(items[0].color).toBe('#2e7d32');
    expect(items[1].id).toBe('leave-11');
    expect(items[1].title).toContain('(demande)');
    expect(items[1].color).toBe('#9c27b0');
  });
});
