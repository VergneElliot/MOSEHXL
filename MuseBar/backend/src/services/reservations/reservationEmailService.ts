/**
 * Best-effort reservation notification emails (guest + venue).
 * Guest-facing mail is sent From / Reply-To {slug}@mosehxl.com so replies land in the venue inbox.
 */

import { EmailService } from '../email/EmailService';
import { BuiltInTemplateId } from '../email/templates/types';
import { getEnvironmentConfig } from '../../config/environment';
import { Logger } from '../../utils/logger';
import type { Reservation, ReservationStatus } from '../../models/reservation';
import {
  createReservationActionToken,
  createReservationRemindToken,
} from './reservationRemindToken';

const INBOX_DOMAIN = 'mosehxl.com';

function formatStartsAt(iso: string, timezone?: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      timeZone: timezone || 'Europe/Paris',
      dateStyle: 'full',
      timeStyle: 'short',
    });
  } catch {
    return new Date(iso).toLocaleString('fr-FR');
  }
}

function frontendBase(): string {
  return (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000').replace(
    /\/$/,
    ''
  );
}

export function buildRelanceUrl(slug: string, reservationId: number): string {
  const token = createReservationRemindToken(reservationId, slug);
  return `${frontendBase()}/reserve/${slug}/relancer/${encodeURIComponent(token)}`;
}

export function buildCancelUrl(slug: string, reservationId: number): string {
  const token = createReservationActionToken(reservationId, slug, 'cancel');
  return `${frontendBase()}/reserve/${slug}/annuler/${encodeURIComponent(token)}`;
}

function getEmailService(): EmailService | null {
  try {
    return EmailService.getInstance(getEnvironmentConfig(), Logger.getInstance());
  } catch {
    try {
      return EmailService.getInstance();
    } catch {
      return null;
    }
  }
}

export function venueInboxFromAddress(slug: string, establishmentName: string): string {
  const email = `${slug}@${INBOX_DOMAIN}`;
  const safeName = String(establishmentName || slug)
    .replace(/[<>\r\n"]/g, '')
    .trim()
    .slice(0, 80);
  return safeName ? `${safeName} <${email}>` : email;
}

export function venueInboxEmail(slug: string): string {
  return `${slug}@${INBOX_DOMAIN}`;
}

async function sendSafe(
  templateId: BuiltInTemplateId,
  to: string | null | undefined,
  data: Record<string, unknown>,
  opts: { fromSlug: string; establishmentName: string }
): Promise<void> {
  if (!to || !to.includes('@')) return;
  if (!opts.fromSlug) {
    Logger.getInstance().warn(
      'Reservation email skipped — missing establishment slug',
      { templateId, to },
      'RESERVATION_EMAIL'
    );
    return;
  }
  const service = getEmailService();
  if (!service) return;
  const from = venueInboxFromAddress(opts.fromSlug, opts.establishmentName);
  const replyTo = venueInboxEmail(opts.fromSlug);
  try {
    await service.sendTemplateEmail(templateId, to, data, { from, replyTo });
  } catch (error) {
    Logger.getInstance().warn(
      'Reservation email failed',
      {
        templateId,
        to,
        from,
        error: error instanceof Error ? error.message : String(error),
      },
      'RESERVATION_EMAIL'
    );
  }
}

function commonPayload(
  r: Reservation,
  establishmentName: string,
  timezone?: string
): Record<string, unknown> {
  return {
    customerName: r.customer_name,
    establishmentName,
    startsAtFormatted: formatStartsAt(r.starts_at, timezone),
    partySize: String(r.party_size),
    customerEmail: r.customer_email || '—',
    customerPhone: r.customer_phone || '—',
    notes: r.notes || '—',
  };
}

export async function notifyReservationRequested(opts: {
  reservation: Reservation;
  establishmentName: string;
  establishmentSlug: string;
  venueEmail: string | null;
  timezone?: string;
}): Promise<void> {
  const { reservation: r, establishmentName, establishmentSlug, venueEmail, timezone } = opts;
  const common = {
    ...commonPayload(r, establishmentName, timezone),
    relanceUrl: buildRelanceUrl(establishmentSlug, r.id),
  };
  const mailOpts = { fromSlug: establishmentSlug, establishmentName };
  await sendSafe(BuiltInTemplateId.RESERVATION_REQUESTED_GUEST, r.customer_email, common, mailOpts);
  await sendSafe(BuiltInTemplateId.RESERVATION_REQUESTED_VENUE, venueEmail, common, mailOpts);
}

export async function notifyReservationReminder(opts: {
  reservation: Reservation;
  establishmentName: string;
  establishmentSlug: string;
  venueEmail: string | null;
  timezone?: string;
}): Promise<void> {
  const { reservation: r, establishmentName, establishmentSlug, venueEmail, timezone } = opts;
  const common = commonPayload(r, establishmentName, timezone);
  const mailOpts = { fromSlug: establishmentSlug, establishmentName };
  await sendSafe(BuiltInTemplateId.RESERVATION_REMINDER_VENUE, venueEmail, common, mailOpts);
}

export async function notifyReservationCancelled(opts: {
  reservation: Reservation;
  establishmentName: string;
  establishmentSlug: string;
  venueEmail: string | null;
  timezone?: string;
}): Promise<void> {
  const { reservation: r, establishmentName, establishmentSlug, venueEmail, timezone } = opts;
  const common = commonPayload(r, establishmentName, timezone);
  const mailOpts = { fromSlug: establishmentSlug, establishmentName };
  await sendSafe(BuiltInTemplateId.RESERVATION_CANCELLED_GUEST, r.customer_email, common, mailOpts);
  await sendSafe(BuiltInTemplateId.RESERVATION_CANCELLED_VENUE, venueEmail, common, mailOpts);
}

export async function notifyGuestReservationStatus(opts: {
  reservation: Reservation;
  establishmentName: string;
  establishmentSlug: string;
  timezone?: string;
}): Promise<void> {
  const { reservation: r, establishmentName, establishmentSlug, timezone } = opts;
  if (!r.customer_email) return;

  const mailOpts = { fromSlug: establishmentSlug, establishmentName };

  if (r.status === 'requested') {
    await sendSafe(
      BuiltInTemplateId.RESERVATION_REQUESTED_GUEST,
      r.customer_email,
      {
        ...commonPayload(r, establishmentName, timezone),
        relanceUrl: buildRelanceUrl(establishmentSlug, r.id),
      },
      mailOpts
    );
    return;
  }

  const data = {
    customerName: r.customer_name,
    establishmentName,
    startsAtFormatted: formatStartsAt(r.starts_at, timezone),
    partySize: String(r.party_size),
    commentaire: r.status_reason || '—',
    cancelUrl: buildCancelUrl(establishmentSlug, r.id),
  };

  if (r.status === 'confirmed') {
    await sendSafe(BuiltInTemplateId.RESERVATION_CONFIRMED, r.customer_email, data, mailOpts);
  } else if (r.status === 'refused') {
    await sendSafe(BuiltInTemplateId.RESERVATION_REFUSED, r.customer_email, data, mailOpts);
  } else if (r.status === 'on_hold') {
    await sendSafe(BuiltInTemplateId.RESERVATION_ON_HOLD, r.customer_email, data, mailOpts);
  }
}

export async function notifyReservationStatusChange(opts: {
  reservation: Reservation;
  previousStatus: ReservationStatus;
  establishmentName: string;
  establishmentSlug: string;
  timezone?: string;
}): Promise<void> {
  const { reservation: r, previousStatus, establishmentName, establishmentSlug, timezone } = opts;
  if (r.status === previousStatus) return;
  await notifyGuestReservationStatus({
    reservation: r,
    establishmentName,
    establishmentSlug,
    timezone,
  });
}
