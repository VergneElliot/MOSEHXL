/**
 * French public holidays (France métropolitaine).
 * Used for CP décompte: jours fériés chômés are not counted toward congés payés.
 */

export interface PublicHoliday {
  date: string;
  name: string;
}

/** Anonymous Gregorian algorithm for Easter Sunday. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function formatDateOnly(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function fixedHoliday(year: number, month: number, day: number, name: string): PublicHoliday {
  return { date: formatDateOnly(new Date(year, month - 1, day, 12, 0, 0, 0)), name };
}

/** All legal public holidays for one calendar year (métropole). */
export function frenchPublicHolidaysForYear(year: number): PublicHoliday[] {
  const easter = easterSunday(year);
  return [
    fixedHoliday(year, 1, 1, "Jour de l'an"),
    { date: formatDateOnly(addDays(easter, 1)), name: 'Lundi de Pâques' },
    fixedHoliday(year, 5, 1, 'Fête du travail'),
    fixedHoliday(year, 5, 8, 'Victoire 1945'),
    { date: formatDateOnly(addDays(easter, 39)), name: 'Ascension' },
    { date: formatDateOnly(addDays(easter, 50)), name: 'Lundi de Pentecôte' },
    fixedHoliday(year, 7, 14, 'Fête nationale'),
    fixedHoliday(year, 8, 15, 'Assomption'),
    fixedHoliday(year, 11, 1, 'Toussaint'),
    fixedHoliday(year, 11, 11, 'Armistice'),
    fixedHoliday(year, 12, 25, 'Noël'),
  ];
}

export function frenchPublicHolidaysForYears(years: number[]): PublicHoliday[] {
  const seen = new Set<string>();
  const out: PublicHoliday[] = [];
  for (const year of years) {
    if (!Number.isFinite(year)) continue;
    for (const h of frenchPublicHolidaysForYear(year)) {
      if (seen.has(h.date)) continue;
      seen.add(h.date);
      out.push(h);
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function isFrenchPublicHoliday(dateKey: string, years?: number[]): boolean {
  const y = parseInt(dateKey.slice(0, 4), 10);
  const list = frenchPublicHolidaysForYears(years ?? [y - 1, y, y + 1]);
  return list.some((h) => h.date === dateKey);
}

export function publicHolidayName(dateKey: string, years?: number[]): string | null {
  const y = parseInt(dateKey.slice(0, 4), 10);
  const list = frenchPublicHolidaysForYears(years ?? [y - 1, y, y + 1]);
  return list.find((h) => h.date === dateKey)?.name ?? null;
}
