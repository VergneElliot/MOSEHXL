/** Fixed choice lists for Paris date/time wheel pickers (fr-FR, 24h). */

import { parisTodayYmd } from '../../utils/formatDate';

export const MONTH_LABELS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

export type MonthIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function hourOptions(): string[] {
  return Array.from({ length: 24 }, (_, h) => pad2(h));
}

export function minuteOptions(): string[] {
  return Array.from({ length: 60 }, (_, m) => pad2(m));
}

export function daysInMonth(year: number, month: MonthIndex): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function dayOptions(year: number, month: MonthIndex): number[] {
  const n = daysInMonth(year, month);
  return Array.from({ length: n }, (_, i) => i + 1);
}

/** Inclusive year band around Paris “today”. */
export function yearOptions(spanPast = 10, spanFuture = 5): number[] {
  const ymd = parisTodayYmd();
  const year = Number(ymd.slice(0, 4));
  const start = year - spanPast;
  const end = year + spanFuture;
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function parseYmdParts(ymd: string): { year: number; month: MonthIndex; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) as MonthIndex;
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function parseHmParts(hm: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function formatYmd(year: number, month: MonthIndex, day: number): string {
  const max = daysInMonth(year, month);
  const d = Math.min(Math.max(1, day), max);
  return `${year}-${pad2(month)}-${pad2(d)}`;
}

export function formatHm(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}
