import { describe, expect, it } from 'vitest';
import {
  applyWeeklyCpCap,
  countLeaveDaysForPayroll,
  countLeaveDaysForPayrollWithCap,
  countMeals,
  DEFAULT_PAYROLL_SETTINGS,
  effectiveEmployeeWorkDays,
  firstWorkDayAfter,
  firstWorkDayOnOrAfter,
  formatDecimalHoursFr,
  minutesToDecimalHours,
  msToDecimalHours,
  parsePayrollSettings,
  type PayrollSettings,
} from './payrollCalculations';

/** Mon–Fri open, Sat–Sun closed (default opening hours). */
const MON_FRI_OPEN: PayrollSettings = {
  ...DEFAULT_PAYROLL_SETTINGS,
  leave_counting_mode: 'ouvres',
  establishment_open_days: [1, 2, 3, 4, 5],
  work_week_days: [1, 2, 3, 4, 5],
};

/** Mon–Sun open (e.g. bar open Sunday). */
const SEVEN_DAYS_OPEN: PayrollSettings = {
  ...MON_FRI_OPEN,
  establishment_open_days: [0, 1, 2, 3, 4, 5, 6],
};

describe('payrollCalculations', () => {
  it('converts minutes to decimal hours (base 100)', () => {
    expect(minutesToDecimalHours(630)).toBe(10.5);
    expect(minutesToDecimalHours(480)).toBe(8);
    expect(formatDecimalHoursFr(10.5)).toBe('10,50');
  });

  it('counts meals per 8 decimal hours', () => {
    expect(countMeals(7.9)).toBe(0);
    expect(countMeals(8)).toBe(1);
    expect(countMeals(16.5)).toBe(2);
  });

  it('ouvres (Mon–Fri open): Wed–Fri absence → 3 days, Sat–Sun not counted', () => {
    const result = countLeaveDaysForPayroll(
      {
        starts_on: '2026-09-02',
        ends_on: '2026-09-04',
        half_day_start: false,
        half_day_end: false,
      },
      MON_FRI_OPEN
    );
    expect(result.counted_days).toBe(3);
    expect(result.count_through).toBe('2026-09-04');
    expect(result.return_on).toBe('2026-09-07');
  });

  it('ouvres: open Sunday counts when venue is open 7/7', () => {
    const result = countLeaveDaysForPayroll(
      {
        starts_on: '2026-09-04', // Fri
        ends_on: '2026-09-04',
        half_day_start: false,
        half_day_end: false,
      },
      SEVEN_DAYS_OPEN
    );
    // Fri + Sat + Sun before Mon return
    expect(result.counted_days).toBe(3);
    expect(result.count_through).toBe('2026-09-06');
  });

  it('ouvrables: Wed–Fri with bridge Saturday when Sat closed', () => {
    const result = countLeaveDaysForPayroll(
      {
        starts_on: '2026-09-02',
        ends_on: '2026-09-04',
        half_day_start: false,
        half_day_end: false,
      },
      {
        ...MON_FRI_OPEN,
        leave_counting_mode: 'ouvrables',
        ouvrables_count_bridge_saturday: true,
      }
    );
    expect(result.counted_days).toBe(4);
    expect(result.count_through).toBe('2026-09-05');
  });

  it('ouvres: Fri only with Mon–Fri open → 1 day (no weekend extension)', () => {
    const result = countLeaveDaysForPayroll(
      {
        starts_on: '2026-09-04',
        ends_on: '2026-09-04',
        half_day_start: false,
        half_day_end: false,
      },
      MON_FRI_OPEN
    );
    expect(result.counted_days).toBe(1);
  });

  it('excludes public holidays (e.g. May 1) from CP count', () => {
    const result = countLeaveDaysForPayroll(
      {
        starts_on: '2026-04-29',
        ends_on: '2026-05-01',
        half_day_start: false,
        half_day_end: false,
      },
      {
        ...MON_FRI_OPEN,
        non_working_dates: ['2026-05-01'],
      }
    );
    expect(result.counted_days).toBe(2);
    expect(result.count_through).toBe('2026-04-30');
  });

  it('ms to decimal hours from time entries', () => {
    expect(msToDecimalHours(10.5 * 3600000)).toBe(10.5);
  });

  it('parsePayrollSettings applies defaults and filters invalid DOW', () => {
    expect(parsePayrollSettings(null).leave_counting_mode).toBe('ouvres');
    const parsed = parsePayrollSettings({
      leave_counting_mode: 'nope' as never,
      work_week_days: [1, 9, -1, 3] as never,
      hours_per_meal: -2,
      max_cp_days_per_week: null,
      non_working_dates: ['2026-01-01', 'bad', 12] as never,
      exclude_public_holidays: false,
    });
    expect(parsed.leave_counting_mode).toBe('ouvres');
    expect(parsed.work_week_days).toEqual([1, 3]);
    expect(parsed.hours_per_meal).toBe(8);
    expect(parsed.max_cp_days_per_week).toBeNull();
    expect(parsed.non_working_dates).toEqual(['2026-01-01']);
    expect(parsed.exclude_public_holidays).toBe(false);
  });

  it('applyWeeklyCpCap and WithCap respect max_cp_days_per_week', () => {
    const leave = {
      starts_on: '2026-09-01',
      ends_on: '2026-09-05',
      half_day_start: false,
      half_day_end: false,
    };
    const capped = applyWeeklyCpCap(leave, { ...MON_FRI_OPEN, max_cp_days_per_week: 2 });
    expect(capped.counted_days).toBeLessThanOrEqual(2);
    expect(
      countLeaveDaysForPayrollWithCap(leave, { ...MON_FRI_OPEN, max_cp_days_per_week: null })
        .counted_days
    ).toBe(countLeaveDaysForPayroll(leave, MON_FRI_OPEN).counted_days);
  });

  it('requested_only counts calendar days with half-day deductions', () => {
    const result = countLeaveDaysForPayroll(
      {
        starts_on: '2026-09-01',
        ends_on: '2026-09-03',
        half_day_start: true,
        half_day_end: true,
      },
      { ...MON_FRI_OPEN, leave_counting_mode: 'requested_only' }
    );
    expect(result.counted_days).toBe(2);
    expect(result.mode).toBe('requested_only');
  });

  it('ouvrables without bridge Saturday does not count closed Sat', () => {
    const result = countLeaveDaysForPayroll(
      {
        starts_on: '2026-09-02',
        ends_on: '2026-09-04',
        half_day_start: false,
        half_day_end: false,
      },
      {
        ...MON_FRI_OPEN,
        leave_counting_mode: 'ouvrables',
        ouvrables_count_bridge_saturday: false,
      }
    );
    expect(result.counted_days).toBe(3);
  });

  it('effectiveEmployeeWorkDays and first work-day helpers', () => {
    expect(effectiveEmployeeWorkDays(MON_FRI_OPEN)).toEqual([1, 2, 3, 4, 5]);
    expect(
      effectiveEmployeeWorkDays({ ...MON_FRI_OPEN, work_week_days: [] })
    ).toEqual([1, 2, 3, 4, 5]);
    const sat = new Date('2026-09-05T12:00:00');
    expect(firstWorkDayOnOrAfter(sat, [1, 2, 3, 4, 5]).getDay()).toBe(1);
    expect(firstWorkDayAfter(sat, [1, 2, 3, 4, 5]).getDay()).toBe(1);
  });

  it('minutesToDecimalHours and countMeals guard non-positive inputs', () => {
    expect(minutesToDecimalHours(-5)).toBe(0);
    expect(minutesToDecimalHours(Number.NaN)).toBe(0);
    expect(countMeals(0)).toBe(0);
    expect(countMeals(10, 0)).toBe(0);
  });
});
