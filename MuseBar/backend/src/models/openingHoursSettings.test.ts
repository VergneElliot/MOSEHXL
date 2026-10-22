import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  pool: { query: mocks.poolQuery },
}));

import {
  OpeningHoursSettingsModel,
  closedDaysOfWeekFromHours,
  defaultOpeningHours,
  isBookableSlot,
  isOpenCalendarDay,
  normalizeOpeningHours,
  openDaysOfWeekFromHours,
  weekdayKeyFromDate,
} from './openingHoursSettings';

describe('openingHoursSettings pure helpers', () => {
  it('normalizeOpeningHours fills defaults and normalizes times', () => {
    const normalized = normalizeOpeningHours({
      timezone: ' Europe/Paris ',
      weekly: {
        mon: { closed: false, open: '9:30', close: '22:00' },
        sun: { closed: true, open: 'bad', close: 'xx' },
      },
    });
    expect(normalized.timezone).toBe('Europe/Paris');
    expect(normalized.weekly.mon.open).toBe('09:30');
    expect(normalized.weekly.sun.closed).toBe(true);
    expect(normalized.weekly.sun.open).toBe(defaultOpeningHours.weekly.sun.open);
    expect(normalized.weekly.tue.open).toBe(defaultOpeningHours.weekly.tue.open);
  });

  it('normalizeOpeningHours tolerates null / non-object input', () => {
    expect(normalizeOpeningHours(null).weekly.mon.closed).toBe(false);
    expect(normalizeOpeningHours(undefined).timezone).toBe(defaultOpeningHours.timezone);
  });

  it('weekdayKeyFromDate maps JS getDay', () => {
    // 2026-10-19 is a Monday
    expect(weekdayKeyFromDate(new Date(2026, 9, 19))).toBe('mon');
    expect(weekdayKeyFromDate(new Date(2026, 9, 18))).toBe('sun');
  });

  it('open/closed days of week follow weekly flags', () => {
    const hours = normalizeOpeningHours({
      weekly: {
        sun: { closed: true, open: '11:00', close: '22:00' },
        mon: { closed: false, open: '11:00', close: '23:00' },
      },
    });
    expect(closedDaysOfWeekFromHours(hours)).toContain(0);
    expect(openDaysOfWeekFromHours(hours)).toContain(1);
    expect(openDaysOfWeekFromHours(hours)).not.toContain(0);
  });

  it('isBookableSlot rejects closed days, closed dates, and off-hours', () => {
    const hours = normalizeOpeningHours({
      timezone: 'Europe/Paris',
      weekly: {
        mon: { closed: false, open: '11:00', close: '14:00' },
        sun: { closed: true, open: '11:00', close: '22:00' },
      },
    });
    // Monday 12:00 Paris
    const ok = isBookableSlot(new Date('2026-10-19T10:00:00.000Z'), hours, 'Europe/Paris');
    expect(ok.ok).toBe(true);

    const closedDay = isBookableSlot(new Date('2026-10-18T12:00:00.000Z'), hours, 'Europe/Paris');
    expect(closedDay.ok).toBe(false);

    const closedDate = isBookableSlot(
      new Date('2026-10-19T10:00:00.000Z'),
      hours,
      'Europe/Paris',
      ['2026-10-19']
    );
    expect(closedDate.ok).toBe(false);
    expect(closedDate.reason).toMatch(/fermées/);

    const tooEarly = isBookableSlot(new Date('2026-10-19T08:00:00.000Z'), hours, 'Europe/Paris');
    expect(tooEarly.ok).toBe(false);
  });

  it('isBookableSlot supports overnight windows', () => {
    const hours = normalizeOpeningHours({
      timezone: 'Europe/Paris',
      weekly: {
        fri: { closed: false, open: '18:00', close: '02:00' },
      },
    });
    // Friday 20:00 Paris (18:00 UTC in winter? Oct 2026 is CEST = UTC+2 → 18:00Z = 20:00 Paris)
    expect(isBookableSlot(new Date('2026-10-23T18:00:00.000Z'), hours, 'Europe/Paris').ok).toBe(
      true
    );
    // Friday 10:00 Paris
    expect(isBookableSlot(new Date('2026-10-23T08:00:00.000Z'), hours, 'Europe/Paris').ok).toBe(
      false
    );
  });

  it('isOpenCalendarDay respects closed weekday and closed dates', () => {
    const hours = normalizeOpeningHours({
      timezone: 'Europe/Paris',
      weekly: { sun: { closed: true, open: '11:00', close: '22:00' } },
    });
    expect(isOpenCalendarDay(new Date('2026-10-18T12:00:00.000Z'), hours, 'Europe/Paris')).toBe(
      false
    );
    expect(
      isOpenCalendarDay(new Date('2026-10-19T12:00:00.000Z'), hours, 'Europe/Paris', new Set(['2026-10-19']))
    ).toBe(false);
    expect(isOpenCalendarDay(new Date('2026-10-19T12:00:00.000Z'), hours, 'Europe/Paris')).toBe(
      true
    );
  });
});

describe('OpeningHoursSettingsModel', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
  });

  it('get returns defaults when no setting row, using establishment timezone', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ timezone: 'America/New_York' }] });
    const hours = await OpeningHoursSettingsModel.get('est-1');
    expect(hours.timezone).toBe('America/New_York');
    expect(hours.weekly.mon.closed).toBe(false);
  });

  it('get parses stored JSON and falls back on invalid JSON', async () => {
    mocks.poolQuery.mockResolvedValueOnce({
      rows: [{ setting_value: JSON.stringify({ weekly: { mon: { closed: true, open: '10:00', close: '18:00' } } }) }],
    });
    const hours = await OpeningHoursSettingsModel.get('est-1');
    expect(hours.weekly.mon.closed).toBe(true);

    mocks.poolQuery.mockResolvedValueOnce({ rows: [{ setting_value: '{not-json' }] });
    const fallback = await OpeningHoursSettingsModel.get('est-1');
    expect(fallback.weekly.mon.open).toBe(defaultOpeningHours.weekly.mon.open);
  });

  it('upsert writes normalized settings and isConfigured checks row', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    const saved = await OpeningHoursSettingsModel.upsert('est-1', {
      weekly: { mon: { closed: false, open: '8:00', close: '20:00' } },
    } as never);
    expect(saved.weekly.mon.open).toBe('08:00');
    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO establishment_settings'),
      expect.arrayContaining(['est-1', 'opening_hours'])
    );

    mocks.poolQuery.mockResolvedValue({ rows: [{}], rowCount: 1 });
    await expect(OpeningHoursSettingsModel.isConfigured('est-1')).resolves.toBe(true);
    mocks.poolQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    await expect(OpeningHoursSettingsModel.isConfigured('est-1')).resolves.toBe(false);
  });
});
