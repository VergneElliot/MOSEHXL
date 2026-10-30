import { describe, expect, it } from 'vitest';
import {
  dayOptions,
  daysInMonth,
  formatHm,
  formatYmd,
  hourOptions,
  minuteOptions,
  parseHmParts,
  parseYmdParts,
} from './parisWheelOptions';

describe('parisWheelOptions', () => {
  it('exposes 24 hours and 60 minutes', () => {
    expect(hourOptions()).toHaveLength(24);
    expect(hourOptions()[0]).toBe('00');
    expect(hourOptions()[23]).toBe('23');
    expect(minuteOptions()).toHaveLength(60);
    expect(minuteOptions()[59]).toBe('59');
  });

  it('clamps February in a leap year', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(dayOptions(2024, 2)).toHaveLength(29);
    expect(formatYmd(2024, 2, 31)).toBe('2024-02-29');
  });

  it('parses and formats YMD / HM', () => {
    expect(parseYmdParts('2026-10-30')).toEqual({ year: 2026, month: 10, day: 30 });
    expect(parseHmParts('9:05')).toEqual({ hour: 9, minute: 5 });
    expect(formatHm(9, 5)).toBe('09:05');
  });
});
