/**
 * Public reservation booking API (no auth) — /api/public/reservations/:slug
 */

import express from 'express';
import { pool } from '../../db/pool';
import { runWithTenantContext } from '../../rls/tenantContext';
import { ReservationModel } from '../../models/reservation';
import {
  OpeningHoursSettingsModel,
  isBookableSlot,
} from '../../models/openingHoursSettings';
import { ReservationClosedDatesModel, toDateKey } from '../../models/reservationClosedDates';
import { InboxModel } from '../../models/inbox';
import { GuestNoShowFlagModel } from '../../models/guestNoShowFlag';
import { isValidEstablishmentSlug } from '../../utils/establishmentSlug';
import { asyncHandler, NotFoundError, ValidationError } from '../../middleware/errorHandler';
import { createAuthRateLimitMiddleware } from '../../middleware/security/AuthEndpointRateLimit';
import {
  notifyReservationRequested,
  notifyReservationReminder,
  notifyReservationCancelled,
} from '../../services/reservations/reservationEmailService';
import {
  parseReservationRemindToken,
  parseReservationActionToken,
  canGuestCancelReservation,
  CANCEL_MIN_HOURS_BEFORE,
} from '../../services/reservations/reservationRemindToken';
import { Logger } from '../../utils/logger';

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** In-memory cooldown for guest relance (reservationId → last remind ms). */
const lastRemindAt = new Map<number, number>();
const REMIND_COOLDOWN_MS = 60 * 60 * 1000;

const publicPostRateLimit = createAuthRateLimitMiddleware({
  logger: {
    security: (event, severity, metadata) => {
      try {
        Logger.getInstance().security(event, severity, metadata || {}, undefined, undefined);
      } catch {
        /* ignore */
      }
    },
  },
  keyPrefix: 'public_reservation_post',
  windowMs: 15 * 60 * 1000,
  maxRequests: process.env.NODE_ENV === 'development' ? 60 : 12,
  keyResolver: (req) => `ip:${req.ip ?? 'unknown'}`,
  errorMessage: 'Trop de demandes. Réessayez plus tard.',
});

const publicRemindRateLimit = createAuthRateLimitMiddleware({
  logger: {
    security: (event, severity, metadata) => {
      try {
        Logger.getInstance().security(event, severity, metadata || {}, undefined, undefined);
      } catch {
        /* ignore */
      }
    },
  },
  keyPrefix: 'public_reservation_remind',
  windowMs: 60 * 60 * 1000,
  maxRequests: process.env.NODE_ENV === 'development' ? 30 : 6,
  keyResolver: (req) => `ip:${req.ip ?? 'unknown'}`,
  errorMessage: 'Trop de relances. Réessayez plus tard.',
});

async function resolveEstablishment(slug: string): Promise<{
  id: string;
  name: string;
  email: string | null;
  timezone: string | null;
  slug: string;
}> {
  if (!isValidEstablishmentSlug(slug)) throw new NotFoundError('Établissement introuvable');
  const result = await pool.query(
    `SELECT id, name, email, timezone, slug FROM establishments WHERE slug = $1`,
    [slug]
  );
  if (!result.rows[0]) throw new NotFoundError('Établissement introuvable');
  return {
    id: String(result.rows[0].id),
    name: String(result.rows[0].name),
    email: (result.rows[0].email as string) || null,
    timezone: (result.rows[0].timezone as string) || null,
    slug: String(result.rows[0].slug),
  };
}

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug || '').toLowerCase();
    const est = await resolveEstablishment(slug);
    const hours = await runWithTenantContext({ establishmentId: est.id }, () =>
      OpeningHoursSettingsModel.get(est.id)
    );
    const configured = await runWithTenantContext({ establishmentId: est.id }, () =>
      OpeningHoursSettingsModel.isConfigured(est.id)
    );
    const closedDates = await runWithTenantContext({ establishmentId: est.id }, () =>
      ReservationClosedDatesModel.get(est.id)
    );

    const timezone = hours.timezone || est.timezone || 'Europe/Paris';

    return res.json({
      establishment: {
        name: est.name,
        slug: est.slug,
      },
      opening_hours: hours,
      opening_hours_configured: configured,
      closed_dates: closedDates.dates,
      timezone,
    });
  })
);

/**
 * Guest-triggered relance — re-notify venue + inbox while status is still `requested`.
 * POST /api/public/reservations/:slug/remind  { token }
 */
router.post(
  '/:slug/remind',
  publicRemindRateLimit,
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug || '').toLowerCase();
    const est = await resolveEstablishment(slug);
    const token = String(req.body?.token || '').trim();
    const parsed = parseReservationRemindToken(token, slug);
    if (!parsed) throw new ValidationError('Lien de relance invalide');

    const last = lastRemindAt.get(parsed.reservationId) || 0;
    if (Date.now() - last < REMIND_COOLDOWN_MS) {
      throw new ValidationError(
        'Une relance a déjà été envoyée récemment. Réessayez dans une heure.'
      );
    }

    const hours = await runWithTenantContext({ establishmentId: est.id }, () =>
      OpeningHoursSettingsModel.get(est.id)
    );
    const timezone = hours.timezone || est.timezone || 'Europe/Paris';

    const reservation = await runWithTenantContext({ establishmentId: est.id }, async () => {
      const r = await ReservationModel.getById(est.id, parsed.reservationId);
      if (!r) throw new NotFoundError('Réservation introuvable');
      if (r.status !== 'requested') {
        throw new ValidationError(
          'Cette demande a déjà été traitée par l’établissement ; une relance n’est plus nécessaire.'
        );
      }

      const startsFormatted = new Date(r.starts_at).toLocaleString('fr-FR', {
        timeZone: timezone,
        dateStyle: 'short',
        timeStyle: 'short',
      });

      await InboxModel.createMessage({
        establishment_id: est.id,
        from_address: r.customer_email || 'relance@mosehxl.com',
        to_address: `${est.slug}@mosehxl.com`,
        subject: `Relance — demande de réservation — ${r.customer_name} — ${startsFormatted}`,
        text_body: [
          `Relance client (pas encore de réponse)`,
          `Client: ${r.customer_name}`,
          `Email: ${r.customer_email || '—'}`,
          `Téléphone: ${r.customer_phone || '—'}`,
          `Personnes: ${r.party_size}`,
          `Date: ${startsFormatted}`,
          r.notes ? `Notes: ${r.notes}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
      });

      return r;
    });

    lastRemindAt.set(parsed.reservationId, Date.now());

    void notifyReservationReminder({
      reservation,
      establishmentName: est.name,
      establishmentSlug: est.slug,
      venueEmail: est.email,
      timezone,
    });

    return res.json({
      ok: true,
      message: 'L’établissement a été relancé. Merci de votre patience.',
    });
  })
);

/**
 * Guest cancel — confirmed or on_hold, only ≥ 48h before starts_at.
 * POST /api/public/reservations/:slug/cancel  { token }
 */
router.post(
  '/:slug/cancel',
  publicRemindRateLimit,
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug || '').toLowerCase();
    const est = await resolveEstablishment(slug);
    const token = String(req.body?.token || '').trim();
    const parsed = parseReservationActionToken(token, slug);
    if (!parsed || parsed.action !== 'cancel') {
      throw new ValidationError('Lien d’annulation invalide');
    }

    const hours = await runWithTenantContext({ establishmentId: est.id }, () =>
      OpeningHoursSettingsModel.get(est.id)
    );
    const timezone = hours.timezone || est.timezone || 'Europe/Paris';

    const reservation = await runWithTenantContext({ establishmentId: est.id }, async () => {
      const r = await ReservationModel.getById(est.id, parsed.reservationId);
      if (!r) throw new NotFoundError('Réservation introuvable');
      if (r.status === 'cancelled') {
        throw new ValidationError('Cette réservation est déjà annulée.');
      }
      if (r.status !== 'confirmed' && r.status !== 'on_hold') {
        throw new ValidationError(
          'Seules les réservations confirmées ou en attente peuvent être annulées en ligne.'
        );
      }
      if (!canGuestCancelReservation(r.starts_at)) {
        throw new ValidationError(
          `Annulation en ligne impossible à moins de ${CANCEL_MIN_HOURS_BEFORE} h avant la réservation. Contactez l’établissement directement.`
        );
      }

      const updated = await ReservationModel.update(est.id, r.id, {
        status: 'cancelled',
        status_reason: 'Annulation client (en ligne)',
      });
      if (!updated) throw new NotFoundError('Réservation introuvable');

      const startsFormatted = new Date(updated.starts_at).toLocaleString('fr-FR', {
        timeZone: timezone,
        dateStyle: 'short',
        timeStyle: 'short',
      });
      await InboxModel.createMessage({
        establishment_id: est.id,
        from_address: updated.customer_email || 'annulation@mosehxl.com',
        to_address: `${est.slug}@mosehxl.com`,
        subject: `Annulation client — ${updated.customer_name} — ${startsFormatted}`,
        text_body: [
          `Le client a annulé sa réservation en ligne.`,
          `Client: ${updated.customer_name}`,
          `Email: ${updated.customer_email || '—'}`,
          `Téléphone: ${updated.customer_phone || '—'}`,
          `Personnes: ${updated.party_size}`,
          `Date: ${startsFormatted}`,
        ].join('\n'),
      });

      return updated;
    });

    void notifyReservationCancelled({
      reservation,
      establishmentName: est.name,
      establishmentSlug: est.slug,
      venueEmail: est.email,
      timezone,
    });

    return res.json({
      ok: true,
      message: 'Votre réservation a bien été annulée.',
    });
  })
);

router.post(
  '/:slug',
  publicPostRateLimit,
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug || '').toLowerCase();
    const est = await resolveEstablishment(slug);

    // Honeypot: bots fill hidden "website" field
    if (typeof req.body?.website === 'string' && req.body.website.trim() !== '') {
      return res.status(201).json({ ok: true });
    }

    const customerName = String(req.body?.customer_name || '').trim();
    const customerEmail = String(req.body?.customer_email || '').trim().toLowerCase();
    const customerPhone = String(req.body?.customer_phone || '').trim();
    const partySize = Number(req.body?.party_size ?? 2);
    const startsAtRaw = String(req.body?.starts_at || '').trim();
    const notes =
      req.body?.notes != null && String(req.body.notes).trim()
        ? String(req.body.notes).trim().slice(0, 2000)
        : null;

    if (!customerName || customerName.length < 2) {
      throw new ValidationError('Nom requis');
    }
    if (!EMAIL_RE.test(customerEmail)) {
      throw new ValidationError('Email invalide');
    }
    if (!customerPhone || customerPhone.length < 6) {
      throw new ValidationError('Téléphone requis');
    }
    if (!Number.isFinite(partySize) || partySize < 1 || partySize > 200) {
      throw new ValidationError('Nombre de personnes invalide');
    }
    if (!startsAtRaw) throw new ValidationError('Date/heure requise');

    const startsAt = new Date(startsAtRaw);
    if (Number.isNaN(startsAt.getTime())) {
      throw new ValidationError('Date/heure invalide');
    }

    const now = new Date();
    if (startsAt.getTime() < now.getTime() - 5 * 60 * 1000) {
      throw new ValidationError('La date doit être dans le futur');
    }

    const hours = await runWithTenantContext({ establishmentId: est.id }, () =>
      OpeningHoursSettingsModel.get(est.id)
    );
    const closedDates = await runWithTenantContext({ establishmentId: est.id }, () =>
      ReservationClosedDatesModel.get(est.id)
    );
    const timezone = hours.timezone || est.timezone || 'Europe/Paris';
    const slot = isBookableSlot(startsAt, hours, timezone, closedDates.dates);
    if (!slot.ok) {
      throw new ValidationError(slot.reason || 'Créneau non disponible');
    }

    // Extra guard using the same date key as admin closures
    const dateKey = toDateKey(startsAt, timezone);
    if (closedDates.dates.includes(dateKey)) {
      throw new ValidationError('Les réservations sont fermées pour cette date');
    }

    const reliability = await GuestNoShowFlagModel.lookup(customerEmail, customerPhone);

    const startsIso = startsAt.toISOString();
    const startsFormatted = startsAt.toLocaleString('fr-FR', {
      timeZone: timezone,
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const { reservation, inboxMessageId } = await runWithTenantContext(
      { establishmentId: est.id },
      async () => {
        const inbox = await InboxModel.createMessage({
          establishment_id: est.id,
          from_address: customerEmail,
          to_address: `${est.slug}@mosehxl.com`,
          subject: `Nouvelle demande de réservation — ${customerName} — ${startsFormatted}`,
          text_body: [
            `Demande publique de réservation`,
            reliability.flagged
              ? `⚠ ALERTE NO-SHOW : ce contact a déjà été signalé (${reliability.flag_count}×, dernier : ${reliability.last_flagged_at ? new Date(reliability.last_flagged_at).toLocaleDateString('fr-FR') : '—'})`
              : null,
            `Client: ${customerName}`,
            `Email: ${customerEmail}`,
            `Téléphone: ${customerPhone}`,
            `Personnes: ${partySize}`,
            `Date: ${startsFormatted}`,
            notes ? `Notes: ${notes}` : null,
          ]
            .filter(Boolean)
            .join('\n'),
        });

        const reservation = await ReservationModel.create({
          establishment_id: est.id,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          party_size: partySize,
          starts_at: startsIso,
          status: 'requested',
          notes,
          source: 'public',
          inbox_message_id: inbox.id,
        });

        return { reservation, inboxMessageId: inbox.id };
      }
    );

    void notifyReservationRequested({
      reservation,
      establishmentName: est.name,
      establishmentSlug: est.slug,
      venueEmail: est.email,
      timezone,
    });

    return res.status(201).json({
      ok: true,
      reservation: {
        id: reservation.id,
        status: reservation.status,
        starts_at: reservation.starts_at,
        party_size: reservation.party_size,
        inbox_message_id: inboxMessageId,
      },
    });
  })
);

export default router;
