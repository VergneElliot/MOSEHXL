/**
 * Staff planning confirmation emails (employee must approve new shifts / series).
 */

import { EmailService } from '../email/EmailService';
import { BuiltInTemplateId } from '../email/templates/types';
import { ShiftConfirmationEmployeeTemplate } from '../email/templates/shiftTemplates';
import { getEnvironmentConfig } from '../../config/environment';
import { Logger } from '../../utils/logger';
import type { StaffShift } from '../../models/staffShift';

function frontendBase(): string {
  return (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000').replace(
    /\/$/,
    ''
  );
}

function formatShiftRange(startsAt: string, endsAt: string): string {
  try {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const day = start.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Paris',
    });
    const t0 = start.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    });
    const t1 = end.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    });
    return `${day}, ${t0} – ${t1}`;
  } catch {
    return `${startsAt} – ${endsAt}`;
  }
}

export async function notifyEmployeeShiftConfirmation(opts: {
  employeeEmail: string;
  employeeName: string;
  establishmentName: string;
  shifts: StaffShift[];
  confirmationToken: string;
}): Promise<void> {
  const { employeeEmail, employeeName, establishmentName, shifts, confirmationToken } = opts;
  if (!employeeEmail || !confirmationToken || shifts.length === 0) return;

  const first = shifts[0]!;
  const token = encodeURIComponent(confirmationToken);
  const confirmUrl = `${frontendBase()}/planning/confirm/${token}?action=confirm`;
  const declineUrl = `${frontendBase()}/planning/confirm/${token}?action=decline`;

  const shiftCountLabel =
    shifts.length === 1
      ? 'une vacation'
      : `${shifts.length} vacations`;

  try {
    const emailService = EmailService.getInstance(getEnvironmentConfig(), Logger.getInstance());
    await emailService.sendTemplateEmail(
      BuiltInTemplateId.SHIFT_CONFIRMATION_EMPLOYEE,
      employeeEmail,
      {
        establishmentName,
        employeeName,
        shiftCountLabel,
        recurrenceLabel: ShiftConfirmationEmployeeTemplate.recurrenceLabel(first.recurrence),
        firstShiftLabel: formatShiftRange(first.starts_at, first.ends_at),
        label: first.label || '—',
        confirmUrl,
        declineUrl,
      }
    );
  } catch (error) {
    try {
      Logger.getInstance().error(
        'Failed to send shift confirmation email',
        error as Error,
        'PLANNING_EMAIL'
      );
    } catch {
      /* ignore */
    }
  }
}
