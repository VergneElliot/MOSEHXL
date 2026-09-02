import { describe, expect, it } from 'vitest';
import {
  analyzePeriod,
  countLeaveDays,
  DEFAULT_LABOR_COMPLIANCE_SETTINGS,
  isOnApprovedLeave,
  leaveCoversDate,
  shiftOverlapsApprovedLeave,
} from './laborCompliance';

describe('laborCompliance', () => {
  it('counts leave days with half days', () => {
    expect(
      countLeaveDays({
        starts_on: '2026-09-01',
        ends_on: '2026-09-03',
        half_day_start: true,
        half_day_end: false,
      })
    ).toBe(2.5);
  });

  it('detects approved leave on date', () => {
    const leaves = [
      {
        user_id: 1,
        starts_on: '2026-09-01',
        ends_on: '2026-09-05',
        half_day_start: false,
        half_day_end: false,
        status: 'approved',
        leave_type: 'paid_leave',
      },
    ];
    expect(isOnApprovedLeave(new Date('2026-09-03T10:00:00'), leaves, 1)).toBe(true);
    expect(isOnApprovedLeave(new Date('2026-09-03T10:00:00'), leaves, 2)).toBe(false);
    expect(leaveCoversDate(leaves[0]!, new Date('2026-09-06'))).toBe(false);
  });

  it('flags insufficient rest between segments', () => {
    const actual = [
      {
        user_id: 1,
        start: new Date('2026-09-01T08:00:00'),
        end: new Date('2026-09-01T20:00:00'),
        source: 'actual' as const,
      },
      {
        user_id: 1,
        start: new Date('2026-09-02T06:00:00'),
        end: new Date('2026-09-02T14:00:00'),
        source: 'actual' as const,
      },
    ];
    const { violations } = analyzePeriod({
      actual,
      planned: [],
      leaves: [],
      settings: DEFAULT_LABOR_COMPLIANCE_SETTINGS,
    });
    expect(violations.some((v) => v.code === 'INSUFFICIENT_REST')).toBe(true);
  });

  it('detects shift overlap with approved leave', () => {
    const leaves = [
      {
        user_id: 5,
        starts_on: '2026-09-10',
        ends_on: '2026-09-12',
        half_day_start: false,
        half_day_end: false,
        status: 'approved',
        leave_type: 'paid_leave',
      },
    ];
    const hit = shiftOverlapsApprovedLeave(
      new Date('2026-09-11T10:00:00'),
      new Date('2026-09-11T18:00:00'),
      leaves,
      5
    );
    expect(hit?.leave_type).toBe('paid_leave');
  });
});
