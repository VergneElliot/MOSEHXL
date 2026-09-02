import { describe, expect, it } from 'vitest';
import {
  countLeaveDaysForPayroll,
  countMeals,
  DEFAULT_PAYROLL_SETTINGS,
  formatDecimalHoursFr,
  minutesToDecimalHours,
  msToDecimalHours,
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
});
