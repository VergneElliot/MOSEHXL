import { formatDateLong } from '../../utils/formatDate';

export interface DayHours {
  closed: boolean;
  open: string;
  close: string;
}

export interface PublicBookingInfo {
  establishment: { name: string; slug: string };
  opening_hours: {
    timezone?: string;
    weekly: Record<string, DayHours>;
  };
  opening_hours_configured: boolean;
  closed_dates?: string[];
}

export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export const emptyPublicReservationForm = {
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  party_size: 2,
  notes: '',
  website: '',
};

export type PublicReservationForm = typeof emptyPublicReservationForm;

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDayFromKey(key: string): Date {
  const [y = 0, m = 1, d = 1] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function weekdayKey(day: Date): (typeof WEEKDAY_KEYS)[number] {
  return WEEKDAY_KEYS[day.getDay()] ?? 'sun';
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Build 30-min slots within open–close (supports overnight). */
export function buildOpenTimeSlots(day: DayHours, stepMin = 30): string[] {
  if (day.closed) return [];
  const openM = timeToMinutes(day.open);
  const closeM = timeToMinutes(day.close);
  const slots: string[] = [];
  if (closeM > openM) {
    for (let m = openM; m < closeM; m += stepMin) {
      slots.push(minutesToTime(m));
    }
  } else {
    for (let m = openM; m < 24 * 60; m += stepMin) {
      slots.push(minutesToTime(m));
    }
    for (let m = 0; m < closeM; m += stepMin) {
      slots.push(minutesToTime(m));
    }
  }
  return slots;
}

export function formatDateFr(d: Date): string {
  return formatDateLong(d);
}

export function isDayBookable(
  day: Date,
  info: PublicBookingInfo,
  todayStart: Date
): boolean {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  if (d < todayStart) return false;
  const dk = dateKey(d);
  if ((info.closed_dates || []).includes(dk)) return false;
  const key = weekdayKey(d);
  const hours = info.opening_hours.weekly[key];
  return Boolean(hours && !hours.closed);
}

export function timeSlotsForDay(info: PublicBookingInfo, selectedDayKey: string): string[] {
  if (!selectedDayKey) return [];
  if ((info.closed_dates || []).includes(selectedDayKey)) return [];
  const day = parseDayFromKey(selectedDayKey);
  const key = weekdayKey(day);
  const hours = info.opening_hours.weekly[key];
  if (!hours || hours.closed) return [];
  return buildOpenTimeSlots(hours, 30);
}

export function slotsForCalendarDay(info: PublicBookingInfo | null, day: Date): string[] {
  const wd = weekdayKey(day);
  const hours = info?.opening_hours.weekly[wd];
  return hours && !hours.closed ? buildOpenTimeSlots(hours, 30) : [];
}

export function readPublicApiError(body: unknown, status: number): string {
  const errObj = (body as { error?: string | { message?: string } }).error;
  return typeof errObj === 'string' ? errObj : errObj?.message || `Erreur ${status}`;
}
