import { describe, expect, it } from 'vitest';
import {
  analyzeBreakViolations,
  analyzeDailyWeeklyHours,
  analyzePeriod,
  analyzeRestViolations,
  countLeaveDays,
  DEFAULT_LABOR_COMPLIANCE_SETTINGS,
  isOnApprovedLeave,
  leaveCoversDate,
  mergeLaborSettings,
  parseLaborSettingsFromJson,
  reconcilePlannedVsActual,
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

  it('merges and parses labor settings from JSON', () => {
    expect(mergeLaborSettings({ max_daily_hours: 9 }).max_daily_hours).toBe(9);
    expect(parseLaborSettingsFromJson(null).max_weekly_hours).toBe(48);
    expect(
      parseLaborSettingsFromJson({
        max_daily_hours: 8,
        block_punch_on_leave: true,
        max_weekly_hours: 'nope',
      }).block_punch_on_leave
    ).toBe(true);
    expect(
      parseLaborSettingsFromJson({
        max_weekly_hours: 'nope',
      }).max_weekly_hours
    ).toBe(48);
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
    expect(
      leaveCoversDate({ ...leaves[0]!, status: 'pending' }, new Date('2026-09-03'))
    ).toBe(false);
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
    expect(
      analyzeRestViolations(actual, DEFAULT_LABOR_COMPLIANCE_SETTINGS).some(
        (v) => v.code === 'INSUFFICIENT_REST'
      )
    ).toBe(true);
  });

  it('flags daily hard/soft hour limits and weekly volume', () => {
    const longDay = [
      {
        user_id: 2,
        start: new Date('2026-09-01T06:00:00'),
        end: new Date('2026-09-01T19:00:00'),
        source: 'actual' as const,
      },
    ];
    const hard = analyzeDailyWeeklyHours(longDay, DEFAULT_LABOR_COMPLIANCE_SETTINGS);
    expect(hard.some((v) => v.code === 'DAILY_HOURS_EXCEEDED' && v.severity === 'error')).toBe(
      true
    );

    const softDay = [
      {
        user_id: 2,
        start: new Date('2026-09-01T08:00:00'),
        end: new Date('2026-09-01T19:00:00'),
        source: 'actual' as const,
      },
    ];
    const soft = analyzeDailyWeeklyHours(softDay, DEFAULT_LABOR_COMPLIANCE_SETTINGS);
    expect(soft.some((v) => v.code === 'DAILY_HOURS_EXCEEDED' && v.severity === 'warning')).toBe(
      true
    );

    const week: typeof longDay = [];
    for (let i = 0; i < 6; i++) {
      week.push({
        user_id: 3,
        start: new Date(`2026-09-0${i + 1}T08:00:00`),
        end: new Date(`2026-09-0${i + 1}T18:00:00`),
        source: 'actual',
      });
    }
    const weekly = analyzeDailyWeeklyHours(week, {
      ...DEFAULT_LABOR_COMPLIANCE_SETTINGS,
      max_daily_hours: 20,
      max_daily_hours_hard: 20,
      max_weekly_hours: 40,
    });
    expect(weekly.some((v) => v.code === 'WEEKLY_HOURS_EXCEEDED')).toBe(true);
  });

  it('flags missing breaks and planned vs actual gaps', () => {
    const actual = [
      {
        user_id: 4,
        start: new Date('2026-09-01T08:00:00'),
        end: new Date('2026-09-01T16:00:00'),
        source: 'actual' as const,
      },
    ];
    expect(
      analyzeBreakViolations(actual, DEFAULT_LABOR_COMPLIANCE_SETTINGS).some(
        (v) => v.code === 'MISSING_BREAK'
      )
    ).toBe(true);

    const planned = [
      {
        user_id: 4,
        start: new Date('2026-09-01T08:00:00'),
        end: new Date('2026-09-01T12:00:00'),
        source: 'planned' as const,
      },
    ];
    const { violations } = reconcilePlannedVsActual(planned, actual, 15);
    expect(violations.some((v) => v.code === 'PLANNED_VS_ACTUAL_GAP')).toBe(true);
  });

  it('analyzePeriod flags punch on approved leave', () => {
    const leaves = [
      {
        user_id: 1,
        starts_on: '2026-09-01',
        ends_on: '2026-09-01',
        half_day_start: false,
        half_day_end: false,
        status: 'approved',
        leave_type: 'sick_leave',
      },
    ];
    const { violations } = analyzePeriod({
      actual: [
        {
          user_id: 1,
          start: new Date('2026-09-01T10:00:00'),
          end: new Date('2026-09-01T12:00:00'),
          source: 'actual',
        },
      ],
      planned: [],
      leaves,
      settings: DEFAULT_LABOR_COMPLIANCE_SETTINGS,
    });
    expect(violations.some((v) => v.code === 'ON_APPROVED_LEAVE')).toBe(true);
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
    expect(
      shiftOverlapsApprovedLeave(
        new Date('2026-09-20T10:00:00'),
        new Date('2026-09-20T18:00:00'),
        leaves,
        5
      )
    ).toBeNull();
  });
});
