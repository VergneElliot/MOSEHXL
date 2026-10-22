import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  endOfMonthIso,
  endOfWeekIso,
  startOfMonthIso,
  startOfWeekIso,
} from './timeClockPanelDates';

describe('timeClockPanelDates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Wednesday 2026-10-14 local — week Mon 12 → Sun 18
    vi.setSystemTime(new Date(2026, 9, 14, 15, 30, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('start/end of week are ISO strings spanning 7 days', () => {
    const start = new Date(startOfWeekIso());
    const end = new Date(endOfWeekIso());
    expect(start.getDay()).toBe(1); // Monday
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('start/end of month cover October 2026', () => {
    const start = new Date(startOfMonthIso());
    const end = new Date(endOfMonthIso());
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(9);
    expect(end.getMonth()).toBe(9);
    expect(end.getDate()).toBe(31);
  });
});
