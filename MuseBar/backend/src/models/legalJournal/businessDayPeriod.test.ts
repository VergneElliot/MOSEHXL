import { describe, expect, it } from 'vitest';
import moment from 'moment-timezone';

import { resolveDailyClosurePeriod } from './businessDayPeriod';

const TZ = 'Europe/Paris';

describe('resolveDailyClosurePeriod', () => {
  it('business_day uses cut time from settings (not hardcoded 02:00)', () => {
    const { start, end } = resolveDailyClosurePeriod({
      mode: 'business_day',
      date: new Date('2026-08-15T12:00:00.000Z'),
      closureTime: '04:00',
      timezone: TZ,
      lastClosedPeriodEnd: null,
    });

    expect(start.format('YYYY-MM-DD HH:mm')).toBe('2026-08-15 04:00');
    expect(end.format('YYYY-MM-DD HH:mm')).toBe('2026-08-16 03:59');
  });

  it('business_day clamps start after last closed period_end', () => {
    const lastEnd = moment.tz('2026-08-15 06:00', TZ).toDate();
    const { start, end } = resolveDailyClosurePeriod({
      mode: 'business_day',
      date: new Date('2026-08-15T12:00:00.000Z'),
      closureTime: '04:00',
      timezone: TZ,
      lastClosedPeriodEnd: lastEnd,
    });

    expect(start.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2026-08-15 06:00:00.001');
    expect(end.format('YYYY-MM-DD HH:mm')).toBe('2026-08-16 03:59');
  });

  it('business_day rejects when last closure already covers the day', () => {
    const lastEnd = moment.tz('2026-08-16 04:00', TZ).toDate();
    expect(() =>
      resolveDailyClosurePeriod({
        mode: 'business_day',
        date: new Date('2026-08-15T12:00:00.000Z'),
        closureTime: '04:00',
        timezone: TZ,
        lastClosedPeriodEnd: lastEnd,
      })
    ).toThrow(/déjà couverte/i);
  });

  it('close_now runs from last period_end to now', () => {
    const lastEnd = moment.tz('2026-08-16 02:00', TZ).toDate();
    const now = moment.tz('2026-08-16 04:30', TZ).toDate();
    const { start, end } = resolveDailyClosurePeriod({
      mode: 'close_now',
      date: now,
      closureTime: '02:00',
      timezone: TZ,
      lastClosedPeriodEnd: lastEnd,
      now,
    });

    expect(start.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2026-08-16 02:00:00.001');
    expect(end.format('YYYY-MM-DD HH:mm')).toBe('2026-08-16 04:30');
  });

  it('close_now rejects when already up to date', () => {
    const now = moment.tz('2026-08-16 04:00', TZ).toDate();
    const lastEnd = moment.tz('2026-08-16 05:00', TZ).toDate();
    expect(() =>
      resolveDailyClosurePeriod({
        mode: 'close_now',
        date: now,
        closureTime: '02:00',
        timezone: TZ,
        lastClosedPeriodEnd: lastEnd,
        now,
      })
    ).toThrow(/Aucune période ouverte à clôturer/i);
  });

  it('business_day rejects a window that has not started yet', () => {
    // 02:11 on the 15th with a 02:00 cut: the night that just ended is the 14th's
    // business day, so closing "the 15th" would blanket a night still to come.
    const now = moment.tz('2026-08-15 02:11', TZ).toDate();
    expect(() =>
      resolveDailyClosurePeriod({
        mode: 'business_day',
        date: moment.tz('2026-08-16 00:00', TZ).toDate(),
        closureTime: '02:00',
        timezone: TZ,
        lastClosedPeriodEnd: null,
        now,
      })
    ).toThrow(/pas encore commencé/i);
  });

  it('business_day with force keeps the canonical window instead of clamping', () => {
    const now = moment.tz('2026-08-16 12:00', TZ).toDate();
    const { start, end } = resolveDailyClosurePeriod({
      mode: 'business_day',
      date: moment.tz('2026-08-15 00:00', TZ).toDate(),
      closureTime: '02:00',
      timezone: TZ,
      // An erroneous bulletin already covers well past this day.
      lastClosedPeriodEnd: moment.tz('2026-08-17 02:00', TZ).toDate(),
      now,
      force: true,
    });

    expect(start.format('YYYY-MM-DD HH:mm')).toBe('2026-08-15 02:00');
    expect(end.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2026-08-16 01:59:59.999');
  });
});
