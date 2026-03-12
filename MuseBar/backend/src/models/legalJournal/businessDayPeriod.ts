/**
 * Business day period utilities.
 * Single source of truth for "business day" boundaries (closure time + timezone).
 * Used by closure bulletins and by the live business-day-stats endpoint.
 */

import moment from 'moment-timezone';

/**
 * Returns the business day period that contains the given date.
 * E.g. closure 02:00 → for date 2025-07-11, period is 11th 02:00 until 12th 01:59:59.999.
 */
export function getBusinessDayPeriod(
  date: Date,
  closureTime: string,
  timezone: string
): { start: moment.Moment; end: moment.Moment } {
  const [hours, minutes] = closureTime.split(':').map(Number);
  const start = moment.tz(date, timezone).set({
    hour: hours,
    minute: minutes ?? 0,
    second: 0,
    millisecond: 0,
  });
  const end = start.clone().add(1, 'day').subtract(1, 'ms');
  return { start, end };
}

/**
 * Returns the current business day period (the one we're in right now).
 * E.g. closure 02:00: if it's 01:30 we're still in the previous day; if it's 03:00 we're in today's period.
 */
export function getCurrentBusinessDayPeriod(
  closureTime: string,
  timezone: string
): { start: moment.Moment; end: moment.Moment } {
  const [hours, minutes] = closureTime.split(':').map(Number);
  const now = moment.tz(moment(), timezone);
  const todayClosure = now
    .clone()
    .startOf('day')
    .set({ hour: hours, minute: minutes ?? 0, second: 0, millisecond: 0 });

  if (now.isBefore(todayClosure)) {
    const start = todayClosure.clone().subtract(1, 'day');
    const end = todayClosure.clone().subtract(1, 'ms');
    return { start, end };
  }
  const start = todayClosure;
  const end = todayClosure.clone().add(1, 'day').subtract(1, 'ms');
  return { start, end };
}
