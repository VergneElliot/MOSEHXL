/**
 * Business day period utilities.
 * Single source of truth for "business day" boundaries (closure time + timezone).
 * Used by closure bulletins and by the live business-day-stats endpoint.
 */

import moment from 'moment-timezone';

export type DailyClosureMode = 'business_day' | 'close_now';

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

export interface ResolveDailyClosurePeriodInput {
  mode: DailyClosureMode;
  /** Calendar date used for business_day mode (ignored for close_now). */
  date: Date;
  closureTime: string;
  timezone: string;
  /** period_end of the last closed, non-annulled DAILY bulletin, if any. */
  lastClosedPeriodEnd: Date | null;
  now?: Date;
  /**
   * Corrective run. Skips the continuity clamp and the "already covered" guard
   * so a replacement bulletin can span a period an erroneous bulletin already
   * touched. Never skips the future-window guard.
   */
  force?: boolean;
}

const FUTURE_WINDOW_ERROR =
  'Cette journée commerciale n’a pas encore commencé : il n’y a rien à clôturer. ' +
  'Après l’heure de coupure, la nuit qui vient de se terminer correspond à la date de la veille.';

/**
 * Resolve the inclusive [start, end] window for a daily closure.
 * - business_day: canonical cut→cut+1d for `date`, clamped after last closed period_end
 * - close_now: last closed period_end (+1ms) → now (or current business-day start if none)
 *
 * A window that starts in the future is always rejected: that is the shape of the
 * "closed the wrong day just after the cut time" mistake, which otherwise produces
 * an empty bulletin that blankets a night that has not happened yet.
 */
export function resolveDailyClosurePeriod(
  input: ResolveDailyClosurePeriodInput
): { start: moment.Moment; end: moment.Moment } {
  const {
    mode,
    date,
    closureTime,
    timezone,
    lastClosedPeriodEnd,
    now = new Date(),
    force = false,
  } = input;

  const nowTz = moment.tz(now, timezone);

  if (mode === 'close_now') {
    const end = nowTz.clone();
    let start: moment.Moment;
    if (lastClosedPeriodEnd) {
      start = moment.tz(lastClosedPeriodEnd, timezone).add(1, 'millisecond');
    } else {
      start = getCurrentBusinessDayPeriod(closureTime, timezone).start;
    }
    if (start.isAfter(end)) {
      throw new Error(
        'Aucune période ouverte à clôturer : la dernière clôture couvre déjà une période ' +
          `qui se termine le ${start.format('DD/MM/YYYY à HH:mm')}. ` +
          'Si cette clôture est erronée, annulez-la avant d’en créer une nouvelle.'
      );
    }
    return { start, end };
  }

  let { start, end } = getBusinessDayPeriod(date, closureTime, timezone);

  if (start.isAfter(nowTz)) {
    throw new Error(FUTURE_WINDOW_ERROR);
  }

  if (lastClosedPeriodEnd && !force) {
    const last = moment.tz(lastClosedPeriodEnd, timezone);
    if (last.isSameOrAfter(end)) {
      throw new Error(
        'Cette journée commerciale est déjà couverte par une clôture précédente. ' +
          'Utilisez « Forcer la création » pour émettre un bulletin correctif, ' +
          'ou annulez d’abord le bulletin erroné.'
      );
    }
    if (last.isSameOrAfter(start)) {
      start = last.clone().add(1, 'millisecond');
    }
  }

  if (start.isAfter(end)) {
    throw new Error('Fenêtre de clôture vide pour cette journée');
  }
  return { start, end };
}
