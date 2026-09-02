import { StaffLeaveModel, type StaffLeaveRequest } from '../../models/staffLeave';
import { TimeEntryModel, type UserHoursTotal } from '../../models/timeEntry';
import { UserModel } from '../../models/user';
import {
  countLeaveDaysForPayrollWithCap,
  countMeals,
  formatDecimalHoursFr,
  msToDecimalHours,
  type LeaveCountResult,
  type PayrollSettings,
} from './payrollCalculations';
import { resolvePayrollSettings } from './payrollSettingsResolver';

export interface PayrollLeaveLine {
  leave_id: number;
  leave_type: string;
  requested_from: string;
  requested_to: string;
  counted_days: number;
  count_from: string;
  count_through: string;
  return_on: string;
}

export interface PayrollEmployeeRow {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  total_minutes: number;
  hours_decimal: number;
  hours_formatted: string;
  meals: number;
  paid_leave_days: number;
  rtt_days: number;
  other_leave_days: number;
  entry_count: number;
  leave_lines: PayrollLeaveLine[];
}

export interface PayrollSummaryReport {
  from: string;
  to: string;
  payroll_settings: PayrollSettings;
  employees: PayrollEmployeeRow[];
  notes: string[];
}

function leaveToLine(
  leave: StaffLeaveRequest,
  settings: PayrollSettings
): { line: PayrollLeaveLine; counted: number; type: string } {
  const result: LeaveCountResult = countLeaveDaysForPayrollWithCap(leave, settings);
  return {
    line: {
      leave_id: leave.id,
      leave_type: leave.leave_type,
      requested_from: leave.starts_on,
      requested_to: leave.ends_on,
      counted_days: result.counted_days,
      count_from: result.count_from,
      count_through: result.count_through,
      return_on: result.return_on,
    },
    counted: result.counted_days,
    type: leave.leave_type,
  };
}

export async function buildPayrollSummary(
  establishmentId: string,
  from: string,
  to: string
): Promise<PayrollSummaryReport> {
  const payrollSettings = await resolvePayrollSettings(establishmentId, { from, to });

  const [users, totals, leaves] = await Promise.all([
    UserModel.listUsersByEstablishment(establishmentId),
    TimeEntryModel.totalsByUser(establishmentId, { from, to }),
    StaffLeaveModel.list(establishmentId, { from, to, status: 'approved' }),
  ]);

  const totalsByUser = new Map<number, UserHoursTotal>(
    totals.map((t) => [t.user_id, t])
  );

  const leaveByUser = new Map<number, StaffLeaveRequest[]>();
  for (const leave of leaves) {
    const list = leaveByUser.get(leave.user_id) ?? [];
    list.push(leave);
    leaveByUser.set(leave.user_id, list);
  }

  const employees: PayrollEmployeeRow[] = users.map((u) => {
    const t = totalsByUser.get(u.id);
    const totalMinutes = t ? Math.round(t.total_ms / 60000) : 0;
    const hoursDecimal = msToDecimalHours(t?.total_ms ?? 0);
    const meals = countMeals(hoursDecimal, payrollSettings.hours_per_meal);

    let paidLeave = 0;
    let rtt = 0;
    let otherLeave = 0;
    const leaveLines: PayrollLeaveLine[] = [];

    for (const leave of leaveByUser.get(u.id) ?? []) {
      const { line, counted, type } = leaveToLine(leave, payrollSettings);
      leaveLines.push(line);
      if (type === 'paid_leave') paidLeave += counted;
      else if (type === 'rtt') rtt += counted;
      else otherLeave += counted;
    }

    return {
      user_id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      total_minutes: totalMinutes,
      hours_decimal: hoursDecimal,
      hours_formatted: formatDecimalHoursFr(hoursDecimal),
      meals,
      paid_leave_days: Math.round(paidLeave * 100) / 100,
      rtt_days: Math.round(rtt * 100) / 100,
      other_leave_days: Math.round(otherLeave * 100) / 100,
      entry_count: t?.entry_count ?? 0,
      leave_lines: leaveLines,
    };
  });

  const openDayLabels = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const openDaysLabel = payrollSettings.establishment_open_days
    .sort((a, b) => a - b)
    .map((d) => openDayLabels[d])
    .join(', ');

  const notes = [
    'Heures en base 100 (centièmes) : 10 h 30 = 10,50.',
    `Repas : 1 par tranche de ${payrollSettings.hours_per_meal} h travaillées (arrondi inférieur).`,
    payrollSettings.leave_counting_mode === 'ouvres'
      ? `Congés décomptés en jours ouvrés : uniquement les jours où l'établissement est ouvert (${openDaysLabel || 'voir Paramètres → Horaires d\'ouverture'}), jusqu'au jour de reprise.`
      : payrollSettings.leave_counting_mode === 'ouvrables'
        ? `Congés en jours ouvrables : jours ouverts + samedi « pont » si applicable (${openDaysLabel}).`
        : 'Congés : dates saisies uniquement (sans extension).',
    payrollSettings.exclude_public_holidays
      ? 'Jours fériés légaux (France métropolitaine) et fermetures Réservations exclus du décompte CP.'
      : 'Jours fériés non exclus automatiquement (fermetures Réservations toujours exclues).',
    'Le comptable valide le caractère CP, le solde (2,5 j/mois) et les heures supplémentaires.',
  ];

  return {
    from,
    to,
    payroll_settings: payrollSettings,
    employees,
    notes,
  };
}

export function buildAccountantCsv(report: PayrollSummaryReport): string {
  const header = [
    'employe_id',
    'nom',
    'email',
    'heures_centiemes',
    'heures_affichage',
    'repas',
    'jours_cp_comptes',
    'jours_rtt_comptes',
    'jours_autres_absences',
    'pointages',
  ].join(';');

  const rows = report.employees.map((e) => {
    const name = [e.last_name, e.first_name].filter(Boolean).join(' ').trim();
    return [
      e.user_id,
      `"${name.replace(/"/g, '""')}"`,
      e.email,
      String(e.hours_decimal).replace('.', ','),
      e.hours_formatted,
      e.meals,
      String(e.paid_leave_days).replace('.', ','),
      String(e.rtt_days).replace('.', ','),
      String(e.other_leave_days).replace('.', ','),
      e.entry_count,
    ].join(';');
  });

  const detailHeader = [
    '',
    '--- DÉTAIL CONGÉS ---',
    'employe_id',
    'type',
    'demande_du',
    'demande_au',
    'compte_du',
    'compte_au',
    'reprise',
    'jours_comptes',
  ].join(';');

  const detailRows = report.employees.flatMap((e) =>
    e.leave_lines.map((l) =>
      [
        e.user_id,
        l.leave_type,
        l.requested_from,
        l.requested_to,
        l.count_from,
        l.count_through,
        l.return_on,
        String(l.counted_days).replace('.', ','),
      ].join(';')
    )
  );

  return [header, ...rows, detailHeader, ...detailRows].join('\n');
}
