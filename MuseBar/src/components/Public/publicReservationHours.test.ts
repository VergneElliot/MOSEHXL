import { describe, expect, it } from 'vitest';
import {
  buildOpenTimeSlots,
  dateKey,
  emptyPublicReservationForm,
  isDayBookable,
  minutesToTime,
  parseDayFromKey,
  readPublicApiError,
  slotsForCalendarDay,
  timeSlotsForDay,
  timeToMinutes,
  type PublicBookingInfo,
} from './publicReservationHours';

function info(partial: Partial<PublicBookingInfo> = {}): PublicBookingInfo {
  return {
    establishment: { name: 'Bar', slug: 'bar' },
    opening_hours_configured: true,
    closed_dates: [],
    opening_hours: {
      weekly: {
        mon: { closed: false, open: '09:00', close: '12:00' },
        tue: { closed: true, open: '00:00', close: '00:00' },
        wed: { closed: false, open: '22:00', close: '02:00' },
        thu: { closed: false, open: '10:00', close: '11:00' },
        fri: { closed: false, open: '10:00', close: '11:00' },
        sat: { closed: false, open: '10:00', close: '11:00' },
        sun: { closed: false, open: '10:00', close: '11:00' },
      },
    },
    ...partial,
  };
}

describe('publicReservationHours', () => {
  it('dateKey / parseDayFromKey round-trip local noon', () => {
    const d = new Date(2026, 9, 5, 15, 30);
    expect(dateKey(d)).toBe('2026-10-05');
    const parsed = parseDayFromKey('2026-10-05');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9);
    expect(parsed.getDate()).toBe(5);
    expect(parsed.getHours()).toBe(12);
  });

  it('timeToMinutes / minutesToTime', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('bad')).toBe(0);
    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(25 * 60)).toBe('01:00');
  });

  it('buildOpenTimeSlots same-day and overnight', () => {
    expect(buildOpenTimeSlots({ closed: true, open: '09:00', close: '17:00' })).toEqual([]);
    expect(buildOpenTimeSlots({ closed: false, open: '09:00', close: '10:30' })).toEqual([
      '09:00',
      '09:30',
      '10:00',
    ]);
    const overnight = buildOpenTimeSlots({ closed: false, open: '23:00', close: '01:00' });
    expect(overnight).toEqual(['23:00', '23:30', '00:00', '00:30']);
  });

  it('isDayBookable rejects past, closed dates, and closed weekdays', () => {
    const todayStart = new Date(2026, 9, 5, 0, 0, 0, 0); // Monday
    const booking = info({ closed_dates: ['2026-10-06'] });
    expect(isDayBookable(new Date(2026, 9, 4), booking, todayStart)).toBe(false);
    expect(isDayBookable(new Date(2026, 9, 5), booking, todayStart)).toBe(true);
    expect(isDayBookable(new Date(2026, 9, 6), booking, todayStart)).toBe(false); // closed date
    expect(isDayBookable(new Date(2026, 9, 13), booking, todayStart)).toBe(false); // tue closed weekday
  });

  it('timeSlotsForDay / slotsForCalendarDay', () => {
    const booking = info({ closed_dates: ['2026-10-05'] });
    expect(timeSlotsForDay(booking, '')).toEqual([]);
    expect(timeSlotsForDay(booking, '2026-10-05')).toEqual([]);
    // 2026-10-07 is Wednesday overnight hours
    expect(timeSlotsForDay(booking, '2026-10-07')[0]).toBe('22:00');
    expect(slotsForCalendarDay(null, new Date(2026, 9, 5))).toEqual([]);
    expect(slotsForCalendarDay(booking, new Date(2026, 9, 5))).toEqual([
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
    ]);
  });

  it('readPublicApiError and empty form defaults', () => {
    expect(emptyPublicReservationForm.party_size).toBe(2);
    expect(readPublicApiError({ error: 'Nope' }, 400)).toBe('Nope');
    expect(readPublicApiError({ error: { message: 'Busy' } }, 409)).toBe('Busy');
    expect(readPublicApiError({}, 500)).toBe('Erreur 500');
  });
});
