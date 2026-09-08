import { describe, expect, it } from 'vitest';
import {
  CALENDAR_COLOR_PALETTE,
  listAvailableCalendarColors,
  normalizeCalendarColor,
  pickNextCalendarColor,
} from '../utils/calendarColors';

describe('calendarColors', () => {
  it('normalizes hex to uppercase', () => {
    expect(normalizeCalendarColor('#1565c0')).toBe('#1565C0');
    expect(normalizeCalendarColor('nope')).toBeNull();
  });

  it('picks first free palette color', () => {
    expect(pickNextCalendarColor([])).toBe(CALENDAR_COLOR_PALETTE[0]);
    expect(pickNextCalendarColor([CALENDAR_COLOR_PALETTE[0]!])).toBe(CALENDAR_COLOR_PALETTE[1]);
  });

  it('falls back past the palette without colliding', () => {
    const next = pickNextCalendarColor(CALENDAR_COLOR_PALETTE);
    expect(normalizeCalendarColor(next)).toBe(next);
    expect(CALENDAR_COLOR_PALETTE.includes(next as (typeof CALENDAR_COLOR_PALETTE)[number])).toBe(
      false
    );
  });

  it('keeps current color available in the picker list', () => {
    const used = [CALENDAR_COLOR_PALETTE[0]!, CALENDAR_COLOR_PALETTE[1]!];
    const available = listAvailableCalendarColors(used, CALENDAR_COLOR_PALETTE[0]);
    expect(available).toContain(CALENDAR_COLOR_PALETTE[0]);
    expect(available).not.toContain(CALENDAR_COLOR_PALETTE[1]);
  });
});
