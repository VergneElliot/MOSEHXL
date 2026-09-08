import { describe, expect, it } from 'vitest';
import {
  formatDateTime,
  formatDateOnly,
  formatTime,
  parisDateTimeLocalToUtcIso,
  utcToParisDateTimeLocal,
  parisWallToUtc,
  formatParisYmdCompact,
} from '@mosehxl/types';

describe('France datetime (Europe/Paris)', () => {
  it('formats summer time as UTC+2 (kitchen-ticket case)', () => {
    const iso = '2026-07-01T14:30:00.000Z';
    expect(formatDateTime(iso)).toBe('01/07/2026 16:30');
    expect(formatTime(iso)).toBe('16:30');
    expect(formatDateOnly(iso)).toBe('01/07/2026');
    expect(utcToParisDateTimeLocal(iso)).toBe('2026-07-01T16:30');
  });

  it('formats winter time as UTC+1', () => {
    const iso = '2026-01-15T14:00:00.000Z';
    expect(formatDateTime(iso)).toBe('15/01/2026 15:00');
    expect(parisDateTimeLocalToUtcIso('2026-01-15T15:00')).toBe('2026-01-15T14:00:00.000Z');
  });

  it('never uses 12-hour clock', () => {
    expect(formatTime('2026-09-03T21:00:00.000Z')).toBe('23:00');
    expect(formatDateTime('2026-09-03T21:00:00.000Z')).not.toMatch(/AM|PM|am|pm/);
  });

  it('converts Paris wall clock to UTC in summer', () => {
    expect(parisDateTimeLocalToUtcIso('2026-07-01T16:30')).toBe('2026-07-01T14:30:00.000Z');
    const d = parisWallToUtc(2026, 7, 1, 16, 30);
    expect(d.toISOString()).toBe('2026-07-01T14:30:00.000Z');
  });

  it('uses Paris civil date for compact Flux-style YYYYMMDD near UTC midnight', () => {
    expect(formatParisYmdCompact('2026-07-27T22:30:00.000Z')).toBe('20260728');
  });
});
