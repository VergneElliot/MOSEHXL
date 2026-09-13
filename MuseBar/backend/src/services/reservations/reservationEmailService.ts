/**
 * Best-effort reservation notification emails (guest + venue).
 * Guest mail: From slug@mosehxl.com, Reply-To slug+r{id}@ so replies attach to that booking.
 */

import { formatDateLong, formatTime } from '@mosehxl/types';
import { EmailService } from '../email/EmailService';
import { BuiltInTemplateId } from '../email/templates/types';
import { getEnvironmentConfig } from '../../config/environment';
import { Logger } from '../../utils/logger';
import type { Reservation, ReservationStatus } from '../../models/reservation';
import {
  createReservationActionToken,
  createReservationRemindToken,
} from './reservationRemindToken';
import { recordOutboundReservationEmail } from './recordOutboundReservationEmail';
import {
  venueInboxEmail,
  venueInboxFromAddress,
  venueInboxReservationReplyTo,
} from './venueInboxAddress';

export {
  venueInboxEmail,
  venueInboxFromAddress,
  venueInboxReservationReplyTo,
} from './venueInboxAddress';

function formatStartsAt(iso: string): string {
  return `${formatDateLong(iso)} à ${formatTime(iso)}`;
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

type SendOpts = {
  fromSlug: string;
  establishmentName: string;
  establishmentId?: string;
  reservationId?: number | null;
  /** Store a Boîte mail copy (guest-facing reservation mails). */
  storeOutboundCopy?: boolean;
  outboundSubject?: string;
  outboundText?: string;
};

async function sendSafe(
  templateId: BuiltInTemplateId,
  to: string | null | undefined,
  data: Record<string, unknown>,
  opts: SendOpts
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
  const replyTo =
    opts.reservationId != null && opts.reservationId > 0
      ? venueInboxReservationReplyTo(opts.fromSlug, opts.reservationId)
      : venueInboxEmail(opts.fromSlug);
  try {
    await service.sendTemplateEmail(templateId, to, data, { from, replyTo });
    if (
      opts.storeOutboundCopy &&
      opts.establishmentId &&
      opts.reservationId != null &&
      opts.reservationId > 0
    ) {
      await recordOutboundReservationEmail({
        establishmentId: opts.establishmentId,
        establishmentSlug: opts.fromSlug,
        reservationId: opts.reservationId,
        toAddress: to,
        subject: opts.outboundSubject || String(templateId),
        textBody: opts.outboundText || opts.outboundSubject || String(templateId),
      });
    }
  } catch (error) {
    Logger.getInstance().warn(
      'Reservation email failed',
      {
        templateId,
        to,
        from,
        replyTo,
        error: error instanceof Error ? error.message : String(error),
      },
      'RESERVATION_EMAIL'
    );
  }
}

function commonPayload(r: Reservation, establishmentName: string): Record<string, unknown> {
  return {
    customerName: r.customer_name,
    establishmentName,
    startsAtFormatted: formatStartsAt(r.starts_at),
    partySize: String(r.party_size),
    customerEmail: r.customer_email || '—',
    customerPhone: r.customer_phone || '—',
    notes: r.notes || '—',
  };
}

function guestMailOpts(
  r: Reservation,
  establishmentName: string,
  establishmentSlug: string,
  subject: string,
  text: string
): SendOpts {
  return {
    fromSlug: establishmentSlug,
    establishmentName,
    establishmentId: r.establishment_id,
    reservationId: r.id,
    storeOutboundCopy: true,
    outboundSubject: subject,
    outboundText: text,
  };
}

export async function notifyReservationRequested(opts: {
  reservation: Reservation;
  establishmentName: string;
  establishmentSlug: string;
  venueEmail: string | null;
  timezone?: string;
}): Promise<void> {
  const { reservation: r, establishmentName, establishmentSlug, venueEmail } = opts;
  const common = {
    ...commonPayload(r, establishmentName),
    relanceUrl: buildRelanceUrl(establishmentSlug, r.id),
  };
  await sendSafe(
    BuiltInTemplateId.RESERVATION_REQUESTED_GUEST,
    r.customer_email,
    common,
    guestMailOpts(
      r,
      establishmentName,
      establishmentSlug,
      `Demande de réservation reçue — ${establishmentName}`,
      `Demande enregistrée pour ${formatStartsAt(r.starts_at)} (${r.party_size} pers.).`
    )
  );
  await sendSafe(BuiltInTemplateId.RESERVATION_REQUESTED_VENUE, venueEmail, common, {
    fromSlug: establishmentSlug,
    establishmentName,
  });
}

export async function notifyReservationReminder(opts: {
  reservation: Reservation;
  establishmentName: string;
  establishmentSlug: string;
  venueEmail: string | null;
  timezone?: string;
}): Promise<void> {
  const { reservation: r, establishmentName, establishmentSlug, venueEmail } = opts;
  const common = commonPayload(r, establishmentName);
  await sendSafe(BuiltInTemplateId.RESERVATION_REMINDER_VENUE, venueEmail, common, {
    fromSlug: establishmentSlug,
    establishmentName,
  });
}

export async function notifyReservationCancelled(opts: {
  reservation: Reservation;
  establishmentName: string;
  establishmentSlug: string;
  venueEmail: string | null;
  timezone?: string;
}): Promise<void> {
  const { reservation: r, establishmentName, establishmentSlug, venueEmail } = opts;
  const common = commonPayload(r, establishmentName);
  await sendSafe(
    BuiltInTemplateId.RESERVATION_CANCELLED_GUEST,
    r.customer_email,
    common,
    guestMailOpts(
      r,
      establishmentName,
      establishmentSlug,
      `Réservation annulée — ${establishmentName}`,
      `Annulation pour ${formatStartsAt(r.starts_at)}.`
    )
  );
  await sendSafe(BuiltInTemplateId.RESERVATION_CANCELLED_VENUE, venueEmail, common, {
    fromSlug: establishmentSlug,
    establishmentName,
  });
}

export async function notifyGuestReservationStatus(opts: {
  reservation: Reservation;
  establishmentName: string;
  establishmentSlug: string;
  timezone?: string;
}): Promise<void> {
  const { reservation: r, establishmentName, establishmentSlug } = opts;
  if (!r.customer_email) return;

  if (r.status === 'requested') {
    await sendSafe(
      BuiltInTemplateId.RESERVATION_REQUESTED_GUEST,
      r.customer_email,
      {
        ...commonPayload(r, establishmentName),
        relanceUrl: buildRelanceUrl(establishmentSlug, r.id),
      },
      guestMailOpts(
        r,
        establishmentName,
        establishmentSlug,
        `Demande de réservation reçue — ${establishmentName}`,
        `Demande enregistrée pour ${formatStartsAt(r.starts_at)} (${r.party_size} pers.).`
      )
    );
    return;
  }

  const data = {
    customerName: r.customer_name,
    establishmentName,
    startsAtFormatted: formatStartsAt(r.starts_at),
    partySize: String(r.party_size),
    commentaire: r.status_reason || '—',
    cancelUrl: buildCancelUrl(establishmentSlug, r.id),
  };

  const commentLine = r.status_reason ? `Commentaire : ${r.status_reason}` : 'Sans commentaire.';

  if (r.status === 'confirmed') {
    await sendSafe(
      BuiltInTemplateId.RESERVATION_CONFIRMED,
      r.customer_email,
      data,
      guestMailOpts(
        r,
        establishmentName,
        establishmentSlug,
        `Réservation confirmée — ${establishmentName}`,
        `Statut : confirmée.\n${commentLine}`
      )
    );
  } else if (r.status === 'refused') {
    await sendSafe(
      BuiltInTemplateId.RESERVATION_REFUSED,
      r.customer_email,
      data,
      guestMailOpts(
        r,
        establishmentName,
        establishmentSlug,
        `Réservation refusée — ${establishmentName}`,
        `Statut : refusée.\n${commentLine}`
      )
    );
  } else if (r.status === 'on_hold') {
    await sendSafe(
      BuiltInTemplateId.RESERVATION_ON_HOLD,
      r.customer_email,
      data,
      guestMailOpts(
        r,
        establishmentName,
        establishmentSlug,
        `Réservation en attente — ${establishmentName}`,
        `Statut : en attente.\n${commentLine}`
      )
    );
  }
}

export async function notifyReservationStatusChange(opts: {
  reservation: Reservation;
  previousStatus: ReservationStatus;
  establishmentName: string;
  establishmentSlug: string;
  timezone?: string;
}): Promise<void> {
  const { reservation: r, previousStatus, establishmentName, establishmentSlug } = opts;
  if (r.status === previousStatus) return;
  await notifyGuestReservationStatus({
    reservation: r,
    establishmentName,
    establishmentSlug,
  });
}
