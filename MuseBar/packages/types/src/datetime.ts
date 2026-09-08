/**
 * France civil date/time for display and form wall-clock values.
 * Instant storage stays UTC ISO / timestamptz. Hash-chain timestamps stay UTC ISO.
 */

export const APP_TIMEZONE = 'Europe/Paris';
export const APP_LOCALE = 'fr-FR';

export type DateInput = string | Date | number | null | undefined;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function parseToDate(value: DateInput): Date | null {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

type ParisParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const PARIS_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function getParisParts(date: Date): ParisParts {
  const bag: Record<string, string> = {};
  for (const part of PARIS_PARTS.formatToParts(date)) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
  };
}

/** Offset of Europe/Paris vs UTC at `date`, in milliseconds (positive in winter/summer, e.g. +3600000). */
function parisOffsetMs(date: Date): number {
  const p = getParisParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

/**
 * Interpret a Paris wall-clock civil time as an exact UTC instant (DST-safe).
 */
export function parisWallToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const first = new Date(utcGuess - parisOffsetMs(new Date(utcGuess)));
  const secondPass = new Date(utcGuess - parisOffsetMs(first));
  return secondPass;
}

export function formatDateTime(value: DateInput): string {
  const date = parseToDate(value);
  if (!date) return 'N/A';
  const p = getParisParts(date);
  return `${pad2(p.day)}/${pad2(p.month)}/${p.year} ${pad2(p.hour)}:${pad2(p.minute)}`;
}

export function formatDateTimeSeconds(value: DateInput): string {
  const date = parseToDate(value);
  if (!date) return 'N/A';
  const p = getParisParts(date);
  return `${pad2(p.day)}/${pad2(p.month)}/${p.year} ${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`;
}

export function formatDateOnly(value: DateInput): string {
  const date = parseToDate(value);
  if (!date) return 'N/A';
  const p = getParisParts(date);
  return `${pad2(p.day)}/${pad2(p.month)}/${p.year}`;
}

export function formatTime(value: DateInput): string {
  const date = parseToDate(value);
  if (!date) return 'N/A';
  const p = getParisParts(date);
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

export function formatDateLong(value: DateInput): string {
  const date = parseToDate(value);
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** YYYYMMDD in Europe/Paris (Flux 10.3 civil date). */
export function formatParisYmdCompact(value: DateInput): string {
  const date = parseToDate(value);
  if (!date) throw new Error(`Invalid date: ${String(value)}`);
  const p = getParisParts(date);
  return `${p.year}${pad2(p.month)}${pad2(p.day)}`;
}

/** YYYYMMDDHHmmss in Europe/Paris. */
export function formatParisDateTimeCompact(value: DateInput = new Date()): string {
  const date = parseToDate(value);
  if (!date) throw new Error(`Invalid date: ${String(value)}`);
  const p = getParisParts(date);
  return `${p.year}${pad2(p.month)}${pad2(p.day)}${pad2(p.hour)}${pad2(p.minute)}${pad2(p.second)}`;
}

export function formatParisYmd(value: DateInput): string {
  const date = parseToDate(value);
  if (!date) return '';
  const p = getParisParts(date);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

export function parisTodayYmd(): string {
  return formatParisYmd(new Date());
}

export function ymdToFrench(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function frenchDateToYmd(value: string): string | null {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const fr = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(trimmed);
  if (!fr) return null;
  const day = Number(fr[1]);
  const month = Number(fr[2]);
  const year = Number(fr[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function normalizeTimeHm(value: string): string | null {
  const trimmed = value.trim().toLowerCase().replace(/h/g, ':').replace(/\s+/g, '');
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(trimmed);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return `${pad2(hour)}:${pad2(minute)}`;
}

/** `YYYY-MM-DDTHH:mm` in Paris wall clock (form state). */
export function utcToParisDateTimeLocal(value: DateInput): string {
  const date = parseToDate(value);
  if (!date) return '';
  const p = getParisParts(date);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

export function parisDateTimeLocalToUtcIso(local: string): string {
  const trimmed = local.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(trimmed);
  if (!m) {
    const date = parseToDate(trimmed);
    return date ? date.toISOString() : trimmed;
  }
  return parisWallToUtc(
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    m[6] ? Number(m[6]) : 0
  ).toISOString();
}

export function parisYmdHmToUtcIso(ymd: string, hm: string): string {
  const date = frenchDateToYmd(ymd) || ymd;
  const time = normalizeTimeHm(hm);
  if (!time || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Date ou heure invalide');
  }
  return parisDateTimeLocalToUtcIso(`${date}T${time}`);
}

export function parisWallDateTimeLocal(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): string {
  return `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}`;
}
