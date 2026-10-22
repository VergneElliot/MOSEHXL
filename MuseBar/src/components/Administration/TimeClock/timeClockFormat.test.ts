import { describe, expect, it, vi } from 'vitest';
import {
  formatDecimalHoursFr,
  formatDuration,
  fromLocalInputValue,
  msToDecimalHours,
  staffLabel,
  toLocalInputValue,
} from './timeClockFormat';

vi.mock('../../../utils/formatDate', () => ({
  utcToParisDateTimeLocal: (iso: string | null | undefined) =>
    iso ? `local:${iso}` : '',
  parisDateTimeLocalToUtcIso: (local: string) => `utc:${local}`,
}));

describe('timeClockFormat', () => {
  it('msToDecimalHours rounds to 2 decimals', () => {
    expect(msToDecimalHours(3600000)).toBe(1);
    expect(msToDecimalHours(5400000)).toBe(1.5);
    expect(msToDecimalHours(1000)).toBe(0);
  });

  it('formatDecimalHoursFr uses comma decimal', () => {
    expect(formatDecimalHoursFr(3600000)).toBe('1,00 h');
    expect(formatDecimalHoursFr(5400000)).toBe('1,50 h');
  });

  it('staffLabel prefers name then email', () => {
    expect(staffLabel({ first_name: 'Ann', last_name: 'Bee', email: 'a@b.c' })).toBe('Ann Bee');
    expect(staffLabel({ first_name: null, last_name: null, email: 'a@b.c' })).toBe('a@b.c');
  });

  it('formatDuration pads minutes', () => {
    expect(formatDuration(0)).toBe('0h00');
    expect(formatDuration(65 * 60000)).toBe('1h05');
  });

  it('delegates local input conversion', () => {
    expect(toLocalInputValue('2026-01-01T12:00:00.000Z')).toBe(
      'local:2026-01-01T12:00:00.000Z'
    );
    expect(fromLocalInputValue('2026-01-01T13:00')).toBe('utc:2026-01-01T13:00');
  });
});
