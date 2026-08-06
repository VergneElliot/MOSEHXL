import { pool } from '../db/pool';
import { Logger } from '../utils/logger';

const SETTING_KEY = 'reservation_closed_dates';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface ReservationClosedDatesSettings {
  dates: string[];
}

function logParseFailure(message: string, error: unknown): void {
  try {
    Logger.getInstance().error(message, error as Error, 'RESERVATION_CLOSED_DATES');
  } catch {
    process.stderr.write(
      `[RESERVATION_CLOSED_DATES] ${message}: ${
        error instanceof Error ? error.message : String(error)
      }\n`
    );
  }
}

export function normalizeClosedDates(raw: unknown): string[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { dates?: unknown }).dates)
      ? (raw as { dates: unknown[] }).dates
      : [];
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const d = item.trim();
    if (!DATE_RE.test(d)) continue;
    if (!out.includes(d)) out.push(d);
  }
  return out.sort();
}

/** Format a Date as YYYY-MM-DD in the given IANA timezone (fallback: local). */
export function toDateKey(day: Date, timezone?: string): string {
  try {
    if (timezone) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(day);
      const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
      return `${get('year')}-${get('month')}-${get('day')}`;
    }
  } catch {
    /* fall through */
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

export class ReservationClosedDatesModel {
  static async get(establishmentId: string): Promise<ReservationClosedDatesSettings> {
    const result = await pool.query(
      `SELECT setting_value FROM establishment_settings
       WHERE establishment_id = $1 AND setting_key = $2`,
      [establishmentId, SETTING_KEY]
    );
    if (result.rows.length === 0) return { dates: [] };
    try {
      const parsed = JSON.parse(result.rows[0].setting_value) as unknown;
      return { dates: normalizeClosedDates(parsed) };
    } catch (error) {
      logParseFailure('Failed to parse reservation_closed_dates JSON', error);
      return { dates: [] };
    }
  }

  static async upsert(
    establishmentId: string,
    dates: string[]
  ): Promise<ReservationClosedDatesSettings> {
    const normalized = { dates: normalizeClosedDates(dates) };
    await pool.query(
      `INSERT INTO establishment_settings (establishment_id, setting_key, setting_value, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (establishment_id, setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
      [establishmentId, SETTING_KEY, JSON.stringify(normalized)]
    );
    return normalized;
  }

  static async isDateClosed(
    establishmentId: string,
    dateKey: string
  ): Promise<boolean> {
    const { dates } = await this.get(establishmentId);
    return dates.includes(dateKey);
  }

  static async setDateClosed(
    establishmentId: string,
    dateKey: string,
    closed: boolean
  ): Promise<ReservationClosedDatesSettings> {
    if (!DATE_RE.test(dateKey)) {
      throw new Error('Invalid date key');
    }
    const current = await this.get(establishmentId);
    const set = new Set(current.dates);
    if (closed) set.add(dateKey);
    else set.delete(dateKey);
    return this.upsert(establishmentId, Array.from(set));
  }
}
