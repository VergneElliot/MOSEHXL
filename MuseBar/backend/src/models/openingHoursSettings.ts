import { pool } from '../db/pool';
import { Logger } from '../utils/logger';
import { DEFAULT_APP_TIMEZONE } from '../config/timezone';

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface DayHours {
  closed: boolean;
  open: string;
  close: string;
}

export interface OpeningHoursSettings {
  timezone?: string;
  weekly: Record<WeekdayKey, DayHours>;
}

const SETTING_KEY = 'opening_hours';
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;
const WEEKDAYS: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function defaultDay(closed = false, open = '11:00', close = '23:00'): DayHours {
  return { closed, open, close };
}

export const defaultOpeningHours: OpeningHoursSettings = {
  timezone: DEFAULT_APP_TIMEZONE,
  weekly: {
    mon: defaultDay(),
    tue: defaultDay(),
    wed: defaultDay(),
    thu: defaultDay(),
    fri: defaultDay(),
    sat: defaultDay(),
    sun: defaultDay(true, '11:00', '22:00'),
  },
};

function logParseFailure(message: string, error: unknown): void {
  try {
    Logger.getInstance().error(message, error as Error, 'OPENING_HOURS');
  } catch {
    process.stderr.write(
      `[OPENING_HOURS] ${message}: ${error instanceof Error ? error.message : String(error)}\n`
    );
  }
}

function normalizeTime(value: unknown, fallback: string): string {
  if (typeof value === 'string' && TIME_RE.test(value.trim())) {
    const [h, m] = value.trim().split(':');
    return `${h!.padStart(2, '0')}:${m}`;
  }
  return fallback;
}

function normalizeDay(raw: unknown, fallback: DayHours): DayHours {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const obj = raw as Record<string, unknown>;
  const closed = typeof obj.closed === 'boolean' ? obj.closed : fallback.closed;
  return {
    closed,
    open: normalizeTime(obj.open, fallback.open),
    close: normalizeTime(obj.close, fallback.close),
  };
}

export function normalizeOpeningHours(
  raw: Partial<OpeningHoursSettings> | Record<string, unknown> | null | undefined
): OpeningHoursSettings {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const weeklyRaw =
    src.weekly && typeof src.weekly === 'object'
      ? (src.weekly as Record<string, unknown>)
      : {};

  const weekly = {} as Record<WeekdayKey, DayHours>;
  for (const day of WEEKDAYS) {
    weekly[day] = normalizeDay(weeklyRaw[day], defaultOpeningHours.weekly[day]);
  }

  const timezone =
    typeof src.timezone === 'string' && src.timezone.trim().length > 0
      ? src.timezone.trim()
      : defaultOpeningHours.timezone;

  return { timezone, weekly };
}

/** JS getDay(): 0=Sun … 6=Sat → our WeekdayKey */
export function weekdayKeyFromDate(d: Date): WeekdayKey {
  const map: WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[d.getDay()]!;
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Whether `startsAt` falls on an open weekday and within that day's open–close window.
 * Uses the wall-clock of `startsAt` in the given IANA timezone when possible via Intl;
 * falls back to local Date parts if Intl fails.
 */
export function isBookableSlot(
  startsAt: Date,
  hours: OpeningHoursSettings,
  timezone?: string,
  closedDateKeys?: Set<string> | string[]
): { ok: boolean; reason?: string } {
  const tz = timezone || hours.timezone || DEFAULT_APP_TIMEZONE;
  let weekday: WeekdayKey;
  let minutes: number;
  let dateOnly: string;

  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(startsAt);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
    const wd = get('weekday').toLowerCase().slice(0, 3);
    const wdMap: Record<string, WeekdayKey> = {
      mon: 'mon',
      tue: 'tue',
      wed: 'wed',
      thu: 'thu',
      fri: 'fri',
      sat: 'sat',
      sun: 'sun',
    };
    weekday = wdMap[wd] || weekdayKeyFromDate(startsAt);
    minutes = Number(get('hour')) * 60 + Number(get('minute'));
    dateOnly = `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    weekday = weekdayKeyFromDate(startsAt);
    minutes = startsAt.getHours() * 60 + startsAt.getMinutes();
    dateOnly = startsAt.toISOString().slice(0, 10);
  }

  const day = hours.weekly[weekday];
  if (!day || day.closed) {
    return { ok: false, reason: 'Établissement fermé ce jour' };
  }

  const closedSet =
    closedDateKeys instanceof Set
      ? closedDateKeys
      : Array.isArray(closedDateKeys)
        ? new Set(closedDateKeys)
        : null;
  if (closedSet?.has(dateOnly)) {
    return { ok: false, reason: 'Les réservations sont fermées pour cette date' };
  }

  const openM = timeToMinutes(day.open);
  const closeM = timeToMinutes(day.close);
  if (closeM <= openM) {
    // Overnight window (e.g. 18:00–02:00): allow from open to 24:00 or 0 to close
    if (!(minutes >= openM || minutes < closeM)) {
      return { ok: false, reason: 'Horaire hors plage d’ouverture' };
    }
  } else if (minutes < openM || minutes >= closeM) {
    return { ok: false, reason: 'Horaire hors plage d’ouverture' };
  }

  return { ok: true };
}

export function isOpenCalendarDay(
  day: Date,
  hours: OpeningHoursSettings,
  timezone?: string,
  closedDateKeys?: Set<string> | string[]
): boolean {
  const tz = timezone || hours.timezone || DEFAULT_APP_TIMEZONE;
  let weekday: WeekdayKey;
  let dateOnly: string;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(day);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
    const wd = get('weekday').toLowerCase().slice(0, 3);
    const wdMap: Record<string, WeekdayKey> = {
      mon: 'mon',
      tue: 'tue',
      wed: 'wed',
      thu: 'thu',
      fri: 'fri',
      sat: 'sat',
      sun: 'sun',
    };
    weekday = wdMap[wd] || weekdayKeyFromDate(day);
    dateOnly = `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    weekday = weekdayKeyFromDate(day);
    const pad = (n: number) => String(n).padStart(2, '0');
    dateOnly = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
  }
  const closedSet =
    closedDateKeys instanceof Set
      ? closedDateKeys
      : Array.isArray(closedDateKeys)
        ? new Set(closedDateKeys)
        : null;
  if (closedSet?.has(dateOnly)) return false;
  const cfg = hours.weekly[weekday];
  return Boolean(cfg && !cfg.closed);
}

export class OpeningHoursSettingsModel {
  static async get(establishmentId: string): Promise<OpeningHoursSettings> {
    const result = await pool.query(
      `SELECT setting_value FROM establishment_settings
       WHERE establishment_id = $1 AND setting_key = $2`,
      [establishmentId, SETTING_KEY]
    );
    if (result.rows.length === 0) {
      const tz = await pool.query(`SELECT timezone FROM establishments WHERE id = $1`, [
        establishmentId,
      ]);
      const estTz = tz.rows[0]?.timezone as string | undefined;
      return normalizeOpeningHours({
        ...defaultOpeningHours,
        timezone: estTz || defaultOpeningHours.timezone,
      });
    }
    try {
      const parsed = JSON.parse(result.rows[0].setting_value) as Record<string, unknown>;
      return normalizeOpeningHours(parsed);
    } catch (error) {
      logParseFailure('Failed to parse opening hours JSON', error);
      return { ...defaultOpeningHours };
    }
  }

  static async upsert(
    establishmentId: string,
    settings: OpeningHoursSettings
  ): Promise<OpeningHoursSettings> {
    const normalized = normalizeOpeningHours(settings);
    await pool.query(
      `INSERT INTO establishment_settings (establishment_id, setting_key, setting_value, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (establishment_id, setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
      [establishmentId, SETTING_KEY, JSON.stringify(normalized)]
    );
    return normalized;
  }

  /** True when a custom opening_hours row exists (vs defaults only). */
  static async isConfigured(establishmentId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM establishment_settings
       WHERE establishment_id = $1 AND setting_key = $2 LIMIT 1`,
      [establishmentId, SETTING_KEY]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
