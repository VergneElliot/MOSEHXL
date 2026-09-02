/**
 * French labor compliance helpers (Code du travail defaults for CHR).
 * Configurable per establishment; defaults are conservative guidance, not legal advice.
 */

export type LaborViolationSeverity = 'info' | 'warning' | 'error';

export type LaborViolationCode =
  | 'DAILY_HOURS_EXCEEDED'
  | 'WEEKLY_HOURS_EXCEEDED'
  | 'INSUFFICIENT_REST'
  | 'MISSING_BREAK'
  | 'ON_APPROVED_LEAVE'
  | 'PLANNED_VS_ACTUAL_GAP';

export interface LaborComplianceSettings {
  max_daily_hours: number;
  max_daily_hours_hard: number;
  max_weekly_hours: number;
  min_rest_hours: number;
  break_after_hours: number;
  break_minutes: number;
  block_punch_on_leave: boolean;
  planned_vs_actual_tolerance_minutes: number;
}

export const DEFAULT_LABOR_COMPLIANCE_SETTINGS: LaborComplianceSettings = {
  max_daily_hours: 10,
  max_daily_hours_hard: 12,
  max_weekly_hours: 48,
  min_rest_hours: 11,
  break_after_hours: 6,
  break_minutes: 20,
  block_punch_on_leave: false,
  planned_vs_actual_tolerance_minutes: 15,
};

export interface LaborViolation {
  code: LaborViolationCode;
  severity: LaborViolationSeverity;
  user_id: number;
  message: string;
  at?: string;
  details?: Record<string, unknown>;
}

export interface TimeSegment {
  user_id: number;
  start: Date;
  end: Date;
  source: 'actual' | 'planned';
  entry_id?: number;
  shift_id?: number;
}

export interface LeaveSpan {
  user_id: number;
  starts_on: string;
  ends_on: string;
  half_day_start: boolean;
  half_day_end: boolean;
  status: string;
  leave_type: string;
}

export function mergeLaborSettings(
  partial: Partial<LaborComplianceSettings> | null | undefined
): LaborComplianceSettings {
  return { ...DEFAULT_LABOR_COMPLIANCE_SETTINGS, ...(partial ?? {}) };
}

export function parseLaborSettingsFromJson(raw: unknown): LaborComplianceSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_LABOR_COMPLIANCE_SETTINGS };
  const obj = raw as Record<string, unknown>;
  const num = (key: keyof LaborComplianceSettings, fallback: number) => {
    const v = obj[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  };
  return mergeLaborSettings({
    max_daily_hours: num('max_daily_hours', DEFAULT_LABOR_COMPLIANCE_SETTINGS.max_daily_hours),
    max_daily_hours_hard: num(
      'max_daily_hours_hard',
      DEFAULT_LABOR_COMPLIANCE_SETTINGS.max_daily_hours_hard
    ),
    max_weekly_hours: num('max_weekly_hours', DEFAULT_LABOR_COMPLIANCE_SETTINGS.max_weekly_hours),
    min_rest_hours: num('min_rest_hours', DEFAULT_LABOR_COMPLIANCE_SETTINGS.min_rest_hours),
    break_after_hours: num('break_after_hours', DEFAULT_LABOR_COMPLIANCE_SETTINGS.break_after_hours),
    break_minutes: num('break_minutes', DEFAULT_LABOR_COMPLIANCE_SETTINGS.break_minutes),
    block_punch_on_leave:
      typeof obj.block_punch_on_leave === 'boolean'
        ? obj.block_punch_on_leave
        : DEFAULT_LABOR_COMPLIANCE_SETTINGS.block_punch_on_leave,
    planned_vs_actual_tolerance_minutes: num(
      'planned_vs_actual_tolerance_minutes',
      DEFAULT_LABOR_COMPLIANCE_SETTINGS.planned_vs_actual_tolerance_minutes
    ),
  });
}

function dateOnlyKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 0, 0, 0, 0);
}

/** Inclusive calendar days between two ISO date strings. */
export function countLeaveDays(leave: {
  starts_on: string;
  ends_on: string;
  half_day_start: boolean;
  half_day_end: boolean;
}): number {
  const start = parseDateOnly(leave.starts_on);
  const end = parseDateOnly(leave.ends_on);
  const msPerDay = 86400000;
  let days = Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
  if (leave.half_day_start) days -= 0.5;
  if (leave.half_day_end) days -= 0.5;
  return Math.max(0, days);
}

export function leaveCoversDate(leave: LeaveSpan, date: Date): boolean {
  if (leave.status !== 'approved') return false;
  const key = dateOnlyKey(date);
  const startKey = leave.starts_on;
  const endKey = leave.ends_on;
  return key >= startKey && key <= endKey;
}

export function isOnApprovedLeave(date: Date, leaves: LeaveSpan[], userId: number): boolean {
  return leaves.some((l) => l.user_id === userId && leaveCoversDate(l, date));
}

function hoursBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / 3600000;
}

function durationHours(seg: TimeSegment): number {
  return Math.max(0, (seg.end.getTime() - seg.start.getTime()) / 3600000);
}

function groupByUser<T extends { user_id: number }>(items: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const list = map.get(item.user_id) ?? [];
    list.push(item);
    map.set(item.user_id, list);
  }
  return map;
}

export function analyzeRestViolations(
  segments: TimeSegment[],
  settings: LaborComplianceSettings
): LaborViolation[] {
  const violations: LaborViolation[] = [];
  const byUser = groupByUser(segments);

  for (const [userId, segs] of byUser) {
    const sorted = [...segs].sort((a, b) => a.start.getTime() - b.start.getTime());
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;
      const rest = hoursBetween(prev.end, curr.start);
      if (rest < settings.min_rest_hours) {
        violations.push({
          code: 'INSUFFICIENT_REST',
          severity: 'warning',
          user_id: userId,
          at: curr.start.toISOString(),
          message: `Repos insuffisant (${rest.toFixed(1)} h) entre deux périodes — minimum ${settings.min_rest_hours} h.`,
          details: { rest_hours: rest, min_rest_hours: settings.min_rest_hours },
        });
      }
    }
  }
  return violations;
}

export function analyzeDailyWeeklyHours(
  segments: TimeSegment[],
  settings: LaborComplianceSettings
): LaborViolation[] {
  const violations: LaborViolation[] = [];
  const byUser = groupByUser(segments);

  for (const [userId, segs] of byUser) {
    const daily = new Map<string, number>();
    for (const seg of segs) {
      const h = durationHours(seg);
      const dayKey = dateOnlyKey(seg.start);
      daily.set(dayKey, (daily.get(dayKey) ?? 0) + h);
    }
    for (const [day, hours] of daily) {
      if (hours > settings.max_daily_hours_hard) {
        violations.push({
          code: 'DAILY_HOURS_EXCEEDED',
          severity: 'error',
          user_id: userId,
          at: `${day}T12:00:00.000Z`,
          message: `Durée journalière ${hours.toFixed(1)} h — dépasse la limite stricte (${settings.max_daily_hours_hard} h).`,
          details: { hours, limit: settings.max_daily_hours_hard },
        });
      } else if (hours > settings.max_daily_hours) {
        violations.push({
          code: 'DAILY_HOURS_EXCEEDED',
          severity: 'warning',
          user_id: userId,
          at: `${day}T12:00:00.000Z`,
          message: `Durée journalière ${hours.toFixed(1)} h — dépasse ${settings.max_daily_hours} h.`,
          details: { hours, limit: settings.max_daily_hours },
        });
      }
    }

    const sorted = [...segs].sort((a, b) => a.start.getTime() - b.start.getTime());
    if (sorted.length === 0) continue;
    const windowStart = sorted[0]!.start.getTime();
    const windowEnd = windowStart + 7 * 86400000;
    let weekly = 0;
    for (const seg of sorted) {
      if (seg.end.getTime() <= windowStart || seg.start.getTime() >= windowEnd) continue;
      const start = Math.max(seg.start.getTime(), windowStart);
      const end = Math.min(seg.end.getTime(), windowEnd);
      weekly += (end - start) / 3600000;
    }
    if (weekly > settings.max_weekly_hours) {
      violations.push({
        code: 'WEEKLY_HOURS_EXCEEDED',
        severity: 'warning',
        user_id: userId,
        message: `Volume hebdomadaire ${weekly.toFixed(1)} h — dépasse ${settings.max_weekly_hours} h.`,
        details: { hours: weekly, limit: settings.max_weekly_hours },
      });
    }
  }
  return violations;
}

export function analyzeBreakViolations(
  segments: TimeSegment[],
  settings: LaborComplianceSettings
): LaborViolation[] {
  const violations: LaborViolation[] = [];
  for (const seg of segments) {
    if (seg.source !== 'actual') continue;
    const hours = durationHours(seg);
    if (hours >= settings.break_after_hours) {
      violations.push({
        code: 'MISSING_BREAK',
        severity: 'info',
        user_id: seg.user_id,
        at: seg.start.toISOString(),
        message: `Période de ${hours.toFixed(1)} h sans pause enregistrée — vérifier la pause de ${settings.break_minutes} min après ${settings.break_after_hours} h.`,
        details: { hours, break_minutes: settings.break_minutes },
      });
    }
  }
  return violations;
}

export interface ReconciliationRow {
  user_id: number;
  day: string;
  planned_minutes: number;
  actual_minutes: number;
  delta_minutes: number;
}

export function reconcilePlannedVsActual(
  planned: TimeSegment[],
  actual: TimeSegment[],
  toleranceMinutes: number
): { rows: ReconciliationRow[]; violations: LaborViolation[] } {
  const rows: ReconciliationRow[] = [];
  const violations: LaborViolation[] = [];
  const userIds = new Set([...planned.map((s) => s.user_id), ...actual.map((s) => s.user_id)]);

  for (const userId of userIds) {
    const days = new Set<string>();
    for (const seg of [...planned, ...actual]) {
      if (seg.user_id !== userId) continue;
      days.add(dateOnlyKey(seg.start));
    }
    for (const day of days) {
      const plannedMin = planned
        .filter((s) => s.user_id === userId && dateOnlyKey(s.start) === day)
        .reduce((acc, s) => acc + durationHours(s) * 60, 0);
      const actualMin = actual
        .filter((s) => s.user_id === userId && dateOnlyKey(s.start) === day)
        .reduce((acc, s) => acc + durationHours(s) * 60, 0);
      const delta = Math.round(actualMin - plannedMin);
      rows.push({
        user_id: userId,
        day,
        planned_minutes: Math.round(plannedMin),
        actual_minutes: Math.round(actualMin),
        delta_minutes: delta,
      });
      if (Math.abs(delta) > toleranceMinutes && (plannedMin > 0 || actualMin > 0)) {
        violations.push({
          code: 'PLANNED_VS_ACTUAL_GAP',
          severity: 'warning',
          user_id: userId,
          at: `${day}T12:00:00.000Z`,
          message: `Écart planifié/pointé de ${delta} min le ${day}.`,
          details: { planned_minutes: Math.round(plannedMin), actual_minutes: Math.round(actualMin), delta },
        });
      }
    }
  }
  return { rows, violations };
}

export function analyzePeriod(params: {
  actual: TimeSegment[];
  planned: TimeSegment[];
  leaves: LeaveSpan[];
  settings: LaborComplianceSettings;
}): {
  violations: LaborViolation[];
  reconciliation: ReconciliationRow[];
} {
  const allActual = params.actual;
  const allPlanned = params.planned;
  const combined = [...allActual, ...allPlanned];

  const violations: LaborViolation[] = [
    ...analyzeRestViolations(combined, params.settings),
    ...analyzeDailyWeeklyHours(allActual, params.settings),
    ...analyzeDailyWeeklyHours(allPlanned, params.settings),
    ...analyzeBreakViolations(allActual, params.settings),
  ];

  for (const seg of allActual) {
    if (isOnApprovedLeave(seg.start, params.leaves, seg.user_id)) {
      violations.push({
        code: 'ON_APPROVED_LEAVE',
        severity: 'warning',
        user_id: seg.user_id,
        at: seg.start.toISOString(),
        message: 'Pointage enregistré alors qu’un congé approuvé couvre cette date.',
      });
    }
  }

  const { rows, violations: reconViolations } = reconcilePlannedVsActual(
    allPlanned,
    allActual,
    params.settings.planned_vs_actual_tolerance_minutes
  );
  violations.push(...reconViolations);

  return { violations, reconciliation: rows };
}

export function shiftOverlapsApprovedLeave(
  shiftStart: Date,
  shiftEnd: Date,
  leaves: LeaveSpan[],
  userId: number
): LeaveSpan | null {
  const day = new Date(shiftStart);
  day.setHours(0, 0, 0, 0);
  const endDay = new Date(shiftEnd);
  endDay.setHours(0, 0, 0, 0);
  while (day.getTime() <= endDay.getTime()) {
    const hit = leaves.find((l) => l.user_id === userId && leaveCoversDate(l, day));
    if (hit) return hit;
    day.setDate(day.getDate() + 1);
  }
  return null;
}
