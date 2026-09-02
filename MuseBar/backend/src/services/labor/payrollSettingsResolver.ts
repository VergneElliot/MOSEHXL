import { LaborSettingsModel } from '../../models/laborSettings';
import {
  openDaysOfWeekFromHours,
} from '../../models/openingHoursSettings';
import { EstablishmentOperatingHoursModel } from '../../models/establishmentOperatingHours';
import { ReservationClosedDatesModel } from '../../models/reservationClosedDates';
import { frenchPublicHolidaysForYears } from './frenchPublicHolidays';
import { parsePayrollSettings, type PayrollSettings } from './payrollCalculations';

function yearsFromDateRange(from?: string, to?: string): number[] {
  const now = new Date().getFullYear();
  const years = new Set<number>([now - 1, now, now + 1]);
  for (const iso of [from, to]) {
    if (!iso) continue;
    const y = parseInt(iso.slice(0, 4), 10);
    if (Number.isFinite(y)) {
      years.add(y);
      years.add(y - 1);
      years.add(y + 1);
    }
  }
  return Array.from(years).sort((a, b) => a - b);
}

/**
 * Merge labor/payroll JSON settings with horaires d'ouverture, jours fériés, and fermetures.
 */
export async function resolvePayrollSettings(
  establishmentId: string,
  opts?: { from?: string; to?: string; years?: number[] }
): Promise<PayrollSettings> {
  const labor = await LaborSettingsModel.get(establishmentId);
  const hours = await EstablishmentOperatingHoursModel.get(establishmentId);
  const closedDates = await ReservationClosedDatesModel.get(establishmentId);
  const openDays = openDaysOfWeekFromHours(hours);

  const years = opts?.years ?? yearsFromDateRange(opts?.from, opts?.to);
  const excludePublicHolidays =
    labor.exclude_public_holidays !== undefined
      ? Boolean(labor.exclude_public_holidays)
      : true;

  const nonWorking = new Set<string>(closedDates.dates);
  if (excludePublicHolidays) {
    for (const h of frenchPublicHolidaysForYears(years)) {
      nonWorking.add(h.date);
    }
  }

  return parsePayrollSettings({
    ...labor,
    establishment_open_days: openDays.length > 0 ? openDays : labor.work_week_days,
    work_week_days:
      labor.work_week_days && labor.work_week_days.length > 0
        ? labor.work_week_days
        : openDays.length > 0
          ? openDays
          : [1, 2, 3, 4, 5],
    non_working_dates: Array.from(nonWorking).sort(),
    exclude_public_holidays: excludePublicHolidays,
  });
}
