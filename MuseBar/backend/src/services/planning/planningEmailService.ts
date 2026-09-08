/**
 * Staff planning confirmation emails (batch of changes per employee).
 */

import { formatDateLong, formatTime } from '@mosehxl/types';
import { EmailService } from '../email/EmailService';
import { BuiltInTemplateId } from '../email/templates/types';
import { getEnvironmentConfig } from '../../config/environment';
import { Logger } from '../../utils/logger';
import type { StaffShiftConfirmationItem } from '../../models/staffShiftConfirmation';

function frontendBase(): string {
  return (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000').replace(
    /\/$/,
    ''
  );
}

function formatShiftRange(startsAt: string, endsAt: string): string {
  return `${formatDateLong(startsAt)}, ${formatTime(startsAt)} – ${formatTime(endsAt)}`;
}

const CHANGE_FR: Record<string, string> = {
  create: 'Nouvelle vacation',
  update: 'Modification',
  delete: 'Annulation',
};

function itemLineHtml(item: StaffShiftConfirmationItem): string {
  const kind = CHANGE_FR[item.change_type] || item.change_type;
  const next =
    item.starts_at && item.ends_at
      ? formatShiftRange(item.starts_at, item.ends_at)
      : '—';
  const label = item.label ? ` · ${escapeHtml(item.label)}` : '';
  if (item.change_type === 'update' && item.previous_starts_at && item.previous_ends_at) {
    const prev = formatShiftRange(item.previous_starts_at, item.previous_ends_at);
    return `<li><strong>${kind}</strong> : ${escapeHtml(prev)} → <strong>${escapeHtml(next)}</strong>${label}</li>`;
  }
  return `<li><strong>${kind}</strong> : ${escapeHtml(next)}${label}</li>`;
}

function itemLineText(item: StaffShiftConfirmationItem): string {
  const kind = CHANGE_FR[item.change_type] || item.change_type;
  const next =
    item.starts_at && item.ends_at
      ? formatShiftRange(item.starts_at, item.ends_at)
      : '—';
  const label = item.label ? ` · ${item.label}` : '';
  if (item.change_type === 'update' && item.previous_starts_at && item.previous_ends_at) {
    const prev = formatShiftRange(item.previous_starts_at, item.previous_ends_at);
    return `- ${kind} : ${prev} → ${next}${label}`;
  }
  return `- ${kind} : ${next}${label}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @deprecated Prefer notifyEmployeePlanningBatch — kept for legacy single-series creates. */
export async function notifyEmployeeShiftConfirmation(opts: {
  employeeEmail: string;
  employeeName: string;
  establishmentName: string;
  shifts: Array<{ starts_at: string; ends_at: string; label: string | null; recurrence: string }>;
  confirmationToken: string;
}): Promise<void> {
  const items: StaffShiftConfirmationItem[] = opts.shifts.map((s, i) => ({
    id: String(i),
    batch_id: '',
    shift_id: null,
    change_type: 'create',
    starts_at: s.starts_at,
    ends_at: s.ends_at,
    label: s.label,
    previous_starts_at: null,
    previous_ends_at: null,
    previous_label: null,
    decision: 'pending',
    decline_reason: null,
    created_at: '',
  }));
  await notifyEmployeePlanningBatch({
    employeeEmail: opts.employeeEmail,
    employeeName: opts.employeeName,
    establishmentName: opts.establishmentName,
    token: opts.confirmationToken,
    items,
  });
}

export async function notifyEmployeePlanningBatch(opts: {
  employeeEmail: string;
  employeeName: string;
  establishmentName: string;
  token: string;
  items: StaffShiftConfirmationItem[];
}): Promise<void> {
  const { employeeEmail, employeeName, establishmentName, token, items } = opts;
  if (!employeeEmail || !token || items.length === 0) return;

  const pageUrl = `${frontendBase()}/planning/confirm/${encodeURIComponent(token)}`;
  const changeCountLabel =
    items.length === 1 ? '1 modification' : `${items.length} modifications`;
  const changesHtml = `<ul>${items.map(itemLineHtml).join('')}</ul>`;
  const changesText = items.map(itemLineText).join('\n');

  try {
    const emailService = EmailService.getInstance(getEnvironmentConfig(), Logger.getInstance());
    await emailService.sendTemplateEmail(
      BuiltInTemplateId.SHIFT_CONFIRMATION_EMPLOYEE,
      employeeEmail,
      {
        establishmentName,
        employeeName,
        changeCountLabel,
        changesHtml,
        changesText,
        pageUrl,
      }
    );
  } catch (error) {
    try {
      Logger.getInstance().error(
        'Failed to send planning confirmation email',
        error as Error,
        'PLANNING_EMAIL'
      );
    } catch {
      /* ignore */
    }
  }
}
