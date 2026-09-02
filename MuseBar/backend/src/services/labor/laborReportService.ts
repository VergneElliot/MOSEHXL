import { LaborSettingsModel } from '../../models/laborSettings';
import { StaffLeaveModel } from '../../models/staffLeave';
import { StaffShiftModel } from '../../models/staffShift';
import { TimeEntryModel } from '../../models/timeEntry';
import {
  analyzePeriod,
  isOnApprovedLeave,
  type LaborViolation,
  type ReconciliationRow,
  type TimeSegment,
} from './laborCompliance';

export interface ComplianceReport {
  violations: LaborViolation[];
  reconciliation: ReconciliationRow[];
  settings: Awaited<ReturnType<typeof LaborSettingsModel.get>>;
}

function entriesToSegments(
  entries: Awaited<ReturnType<typeof TimeEntryModel.list>>
): TimeSegment[] {
  return entries
    .filter((e) => e.clock_out_at)
    .map((e) => ({
      user_id: e.user_id,
      start: new Date(e.clock_in_at),
      end: new Date(e.clock_out_at!),
      source: 'actual' as const,
      entry_id: e.id,
    }));
}

function shiftsToSegments(
  shifts: Awaited<ReturnType<typeof StaffShiftModel.list>>
): TimeSegment[] {
  return shifts
    .filter((s) => s.approval_status !== 'declined')
    .map((s) => ({
      user_id: s.user_id,
      start: new Date(s.starts_at),
      end: new Date(s.ends_at),
      source: 'planned' as const,
      shift_id: s.id,
    }));
}

export async function buildComplianceReport(
  establishmentId: string,
  from: string,
  to: string
): Promise<ComplianceReport> {
  const [entries, shifts, leaves, settings] = await Promise.all([
    TimeEntryModel.list(establishmentId, { from, to }),
    StaffShiftModel.list(establishmentId, { from, to }),
    StaffLeaveModel.listApprovedForRange(establishmentId, from, to),
    LaborSettingsModel.get(establishmentId),
  ]);

  const actual = entriesToSegments(entries);
  const planned = shiftsToSegments(shifts);
  const leaveSpans = leaves.map((l) => ({
    user_id: l.user_id,
    starts_on: l.starts_on,
    ends_on: l.ends_on,
    half_day_start: l.half_day_start,
    half_day_end: l.half_day_end,
    status: l.status,
    leave_type: l.leave_type,
  }));

  const { violations, reconciliation } = analyzePeriod({
    actual,
    planned,
    leaves: leaveSpans,
    settings,
  });

  return { violations, reconciliation, settings };
}

export function buildPayrollCsv(
  entries: Awaited<ReturnType<typeof TimeEntryModel.list>>,
  totals: Awaited<ReturnType<typeof TimeEntryModel.totalsByUser>>
): string {
  const header = [
    'employe_id',
    'nom',
    'email',
    'entree',
    'sortie',
    'duree_minutes',
    'source',
    'note',
  ].join(';');

  const rows = entries.map((e) => {
    const end = e.clock_out_at ? new Date(e.clock_out_at) : null;
    const start = new Date(e.clock_in_at);
    const minutes = end ? Math.round((end.getTime() - start.getTime()) / 60000) : '';
    const name = [e.last_name, e.first_name].filter(Boolean).join(' ').trim();
    return [
      e.user_id,
      `"${name.replace(/"/g, '""')}"`,
      e.email,
      e.clock_in_at,
      e.clock_out_at ?? '',
      minutes,
      e.source,
      `"${(e.note ?? '').replace(/"/g, '""')}"`,
    ].join(';');
  });

  const totalRows = totals.map((t) => {
    const name = [t.last_name, t.first_name].filter(Boolean).join(' ').trim();
    return [
      t.user_id,
      `"${name.replace(/"/g, '""')}"`,
      t.email,
      '',
      '',
      Math.round(t.total_ms / 60000),
      'TOTAL',
      `"${t.entry_count} pointage(s)"`,
    ].join(';');
  });

  return [header, ...rows, '', '--- TOTAUX ---', ...totalRows].join('\n');
}

export async function checkPunchLeaveConflict(
  establishmentId: string,
  userId: number
): Promise<{ on_leave: boolean; block: boolean; message?: string }> {
  const settings = await LaborSettingsModel.get(establishmentId);
  const today = new Date();
  const from = new Date(today);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);

  const leaves = await StaffLeaveModel.listApprovedForRange(
    establishmentId,
    from.toISOString(),
    to.toISOString()
  );
  const leaveSpans = leaves.map((l) => ({
    user_id: l.user_id,
    starts_on: l.starts_on,
    ends_on: l.ends_on,
    half_day_start: l.half_day_start,
    half_day_end: l.half_day_end,
    status: l.status,
    leave_type: l.leave_type,
  }));

  const onLeave = isOnApprovedLeave(today, leaveSpans, userId);
  if (!onLeave) return { on_leave: false, block: false };

  return {
    on_leave: true,
    block: settings.block_punch_on_leave,
    message: 'Un congé approuvé couvre la date du jour.',
  };
}
