import { describe, expect, it } from 'vitest';
import {
  frenchPublicHolidaysForYear,
  isFrenchPublicHoliday,
} from './frenchPublicHolidays';

describe('frenchPublicHolidays', () => {
  it('includes fixed and Easter-based holidays for 2026', () => {
    const holidays = frenchPublicHolidaysForYear(2026);
    const dates = holidays.map((h) => h.date);
    expect(dates).toContain('2026-01-01');
    expect(dates).toContain('2026-05-01');
    expect(dates).toContain('2026-12-25');
    expect(dates).toContain('2026-04-06');
  });

  it('detects a public holiday by date key', () => {
    expect(isFrenchPublicHoliday('2026-05-01')).toBe(true);
    expect(isFrenchPublicHoliday('2026-05-02')).toBe(false);
  });
});
