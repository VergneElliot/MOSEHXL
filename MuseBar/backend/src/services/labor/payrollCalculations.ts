/**
 * Payroll-oriented calculations for pointage / congés (French CHR defaults).
 *
 * Default mode **jours ouvrés**: only days the establishment is open count toward CP.
 * Opening days come from Paramètres → Horaires d'ouverture (establishment service schedule).
 * If the venue is open on Sunday, Sunday can count; closed days never count.
 *
 * Optional **jours ouvrables** mode: same establishment schedule, but may count a closed
 * Saturday when it falls between leave days and the return date (strict legal ouvrables).
 */

export type LeaveCountingMode = 'ouvrables' | 'ouvres' | 'requested_only';

export interface PayrollSettings {
  leave_counting_mode: LeaveCountingMode;
  /** Employee scheduled work days (legacy override). */
  work_week_days: number[];
  /** Days the establishment is open for service (0=Sun … 6=Sat), from horaires d'ouverture. */
  establishment_open_days: number[];
  hours_per_meal: number;
  max_cp_days_per_week: number | null;
  /** Ouvrables: count a closed Saturday between leave and return (legal default true). */
  ouvrables_count_bridge_saturday: boolean;
  /** Dates that never count toward CP (jours fériés + fermetures exceptionnelles). */
  non_working_dates: string[];
  /** When true, French public holidays are merged into non_working_dates. */
  exclude_public_holidays: boolean;
}

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  leave_counting_mode: 'ouvres',
  work_week_days: [1, 2, 3, 4, 5],
  establishment_open_days: [1, 2, 3, 4, 5, 6],
  hours_per_meal: 8,
  max_cp_days_per_week: 5,
  ouvrables_count_bridge_saturday: true,
  non_working_dates: [],
  exclude_public_holidays: true,
};

export interface LeaveCountInput {
  starts_on: string;
  ends_on: string;
  half_day_start: boolean;
  half_day_end: boolean;
}

export interface LeaveCountResult {
  counted_days: number;
  count_from: string;
  count_through: string;
  return_on: string;
  mode: LeaveCountingMode;
}

export function parsePayrollSettings(partial: Partial<PayrollSettings> | null | undefined): PayrollSettings {
  if (!partial) return { ...DEFAULT_PAYROLL_SETTINGS };
  const filterDow = (arr: unknown, fallback: number[]) =>
    Array.isArray(arr)
      ? arr.filter((d) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)
      : fallback;
  const openDays = filterDow(
    partial.establishment_open_days,
    DEFAULT_PAYROLL_SETTINGS.establishment_open_days
  );
  const workDays = filterDow(partial.work_week_days, DEFAULT_PAYROLL_SETTINGS.work_week_days);
  return {
    leave_counting_mode:
      partial.leave_counting_mode === 'ouvrables' ||
      partial.leave_counting_mode === 'requested_only' ||
      partial.leave_counting_mode === 'ouvres'
        ? partial.leave_counting_mode
        : DEFAULT_PAYROLL_SETTINGS.leave_counting_mode,
    work_week_days: workDays.length > 0 ? workDays : DEFAULT_PAYROLL_SETTINGS.work_week_days,
    establishment_open_days:
      openDays.length > 0 ? openDays : workDays.length > 0 ? workDays : DEFAULT_PAYROLL_SETTINGS.establishment_open_days,
    hours_per_meal:
      typeof partial.hours_per_meal === 'number' && partial.hours_per_meal > 0
        ? partial.hours_per_meal
        : DEFAULT_PAYROLL_SETTINGS.hours_per_meal,
    max_cp_days_per_week:
      partial.max_cp_days_per_week === null
        ? null
        : typeof partial.max_cp_days_per_week === 'number' && partial.max_cp_days_per_week > 0
          ? partial.max_cp_days_per_week
          : DEFAULT_PAYROLL_SETTINGS.max_cp_days_per_week,
    ouvrables_count_bridge_saturday:
      typeof partial.ouvrables_count_bridge_saturday === 'boolean'
        ? partial.ouvrables_count_bridge_saturday
        : DEFAULT_PAYROLL_SETTINGS.ouvrables_count_bridge_saturday,
    non_working_dates: Array.isArray(partial.non_working_dates)
      ? partial.non_working_dates.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
      : DEFAULT_PAYROLL_SETTINGS.non_working_dates,
    exclude_public_holidays:
      typeof partial.exclude_public_holidays === 'boolean'
        ? partial.exclude_public_holidays
        : DEFAULT_PAYROLL_SETTINGS.exclude_public_holidays,
  };
}

/** Days used to find first/last employee work day in the absence window. */
export function effectiveEmployeeWorkDays(settings: PayrollSettings): number[] {
  return settings.work_week_days.length > 0
    ? settings.work_week_days
    : settings.establishment_open_days;
}

export function minutesToDecimalHours(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.round((minutes / 60) * 100) / 100;
}

export function msToDecimalHours(ms: number): number {
  return minutesToDecimalHours(ms / 60000);
}

export function formatDecimalHoursFr(hours: number): string {
  return hours.toFixed(2).replace('.', ',');
}

export function countMeals(decimalHours: number, hoursPerMeal = 8): number {
  if (decimalHours <= 0 || hoursPerMeal <= 0) return 0;
  return Math.floor(decimalHours / hoursPerMeal);
}

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

function formatDateOnly(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addCalendarDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dayOfWeek(d: Date): number {
  return d.getDay();
}

function isWorkDay(d: Date, workDays: number[]): boolean {
  return workDays.includes(dayOfWeek(d));
}

function isEstablishmentOpen(d: Date, settings: PayrollSettings): boolean {
  return settings.establishment_open_days.includes(dayOfWeek(d));
}

function isNonWorkingDate(d: Date, settings: PayrollSettings): boolean {
  const key = formatDateOnly(d);
  return settings.non_working_dates.includes(key);
}

/**
 * Should this calendar day count toward CP in the absence window?
 * @param previousDayCounted - for ouvrables bridge Saturday rule
 */
function isCountedDay(d: Date, settings: PayrollSettings, previousDayCounted = false): boolean {
  if (isNonWorkingDate(d, settings)) return false;

  const mode = settings.leave_counting_mode;
  if (mode === 'requested_only') return true;

  if (mode === 'ouvres') {
    return isEstablishmentOpen(d, settings);
  }

  if (isEstablishmentOpen(d, settings)) return true;
  if (
    settings.ouvrables_count_bridge_saturday &&
    dayOfWeek(d) === 6 &&
    !isEstablishmentOpen(d, settings) &&
    previousDayCounted
  ) {
    return true;
  }
  return false;
}

export function firstWorkDayOnOrAfter(from: Date, workDays: number[]): Date {
  let d = new Date(from);
  d.setHours(12, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    if (isWorkDay(d, workDays)) return d;
    d = addCalendarDays(d, 1);
  }
  return d;
}

export function firstWorkDayAfter(from: Date, workDays: number[]): Date {
  return firstWorkDayOnOrAfter(addCalendarDays(from, 1), workDays);
}

export function countLeaveDaysForPayroll(
  leave: LeaveCountInput,
  settings: PayrollSettings
): LeaveCountResult {
  const mode = settings.leave_counting_mode;
  const employeeDays = effectiveEmployeeWorkDays(settings);

  if (mode === 'requested_only') {
    let days =
      Math.floor(
        (parseDateOnly(leave.ends_on).getTime() - parseDateOnly(leave.starts_on).getTime()) /
          86400000
      ) + 1;
    if (leave.half_day_start) days -= 0.5;
    if (leave.half_day_end) days -= 0.5;
    return {
      counted_days: Math.max(0, days),
      count_from: leave.starts_on,
      count_through: leave.ends_on,
      return_on: formatDateOnly(firstWorkDayAfter(parseDateOnly(leave.ends_on), employeeDays)),
      mode,
    };
  }

  const requestedStart = parseDateOnly(leave.starts_on);
  const requestedEnd = parseDateOnly(leave.ends_on);
  const firstCpDay = firstWorkDayOnOrAfter(requestedStart, employeeDays);
  const returnDay = firstWorkDayAfter(requestedEnd, employeeDays);

  let days = 0;
  let countFrom: Date | null = null;
  let countThrough: Date | null = null;
  let cursor = new Date(firstCpDay);
  let previousCounted = false;

  while (cursor < returnDay) {
    if (isCountedDay(cursor, settings, previousCounted)) {
      if (!countFrom) countFrom = new Date(cursor);
      countThrough = new Date(cursor);
      days += 1;
      previousCounted = true;
    } else {
      previousCounted = false;
    }
    cursor = addCalendarDays(cursor, 1);
  }

  if (leave.half_day_start && days > 0) days -= 0.5;
  if (leave.half_day_end && days > 0) days -= 0.5;

  return {
    counted_days: Math.max(0, days),
    count_from: countFrom ? formatDateOnly(countFrom) : leave.starts_on,
    count_through: countThrough ? formatDateOnly(countThrough) : leave.ends_on,
    return_on: formatDateOnly(returnDay),
    mode,
  };
}

function weekKey(d: Date): string {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return formatDateOnly(x);
}

export function applyWeeklyCpCap(
  leave: LeaveCountInput,
  settings: PayrollSettings
): LeaveCountResult {
  const base = countLeaveDaysForPayroll(leave, settings);
  const cap = settings.max_cp_days_per_week;
  if (cap == null || base.counted_days <= 0) return base;

  const firstCpDay = parseDateOnly(base.count_from);
  const returnDay = parseDateOnly(base.return_on);

  const byWeek = new Map<string, number>();
  let cursor = new Date(firstCpDay);
  while (cursor < returnDay) {
    if (isCountedDay(cursor, settings)) {
      const wk = weekKey(cursor);
      byWeek.set(wk, (byWeek.get(wk) ?? 0) + 1);
    }
    cursor = addCalendarDays(cursor, 1);
  }

  let total = 0;
  for (const n of byWeek.values()) {
    total += Math.min(n, cap);
  }

  let days = total;
  if (leave.half_day_start) days -= 0.5;
  if (leave.half_day_end) days -= 0.5;

  return { ...base, counted_days: Math.max(0, days) };
}

export function countLeaveDaysForPayrollWithCap(
  leave: LeaveCountInput,
  settings: PayrollSettings
): LeaveCountResult {
  if (settings.max_cp_days_per_week != null) {
    return applyWeeklyCpCap(leave, settings);
  }
  return countLeaveDaysForPayroll(leave, settings);
}
