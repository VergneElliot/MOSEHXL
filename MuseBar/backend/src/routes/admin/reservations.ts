import express from 'express';
import { getEstablishmentId, requireAuth, requireEstablishmentAdminOrPermission } from '../auth';
import { P } from '../../permissions/registry';
import { asyncHandler, NotFoundError, ValidationError } from '../../middleware/errorHandler';
import { ReservationModel } from '../../models/reservation';
import { OpeningHoursSettingsModel } from '../../models/openingHoursSettings';
import { ReservationClosedDatesModel } from '../../models/reservationClosedDates';
import { GuestNoShowFlagModel } from '../../models/guestNoShowFlag';
import { pool } from '../../db/pool';
import { randomUUID } from 'crypto';
import { notifyReservationStatusChange, notifyGuestReservationStatus } from '../../services/reservations/reservationEmailService';

const router = express.Router();
router.use(requireAuth, requireEstablishmentAdminOrPermission(P.access_reservations));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const reservations = await ReservationModel.list(establishmentId, {
      from: typeof req.query.from === 'string' ? req.query.from : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
    });
    const enriched = await Promise.all(
      reservations.map(async (r) => {
        const guest_reliability = await GuestNoShowFlagModel.lookup(
          r.customer_email,
          r.customer_phone
        );
        return { ...r, guest_reliability };
      })
    );
    return res.json({ reservations: enriched });
  })
);

router.get(
  '/public-link',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const est = await pool.query(`SELECT slug, name FROM establishments WHERE id = $1`, [
      establishmentId,
    ]);
    const slug = est.rows[0]?.slug as string | undefined;
    const hoursConfigured = await OpeningHoursSettingsModel.isConfigured(establishmentId);
    const frontend = (process.env.FRONTEND_URL || process.env.APP_URL || '').replace(/\/$/, '');
    return res.json({
      slug: slug || null,
      url: slug ? (frontend ? `${frontend}/reserve/${slug}` : `/reserve/${slug}`) : null,
      opening_hours_configured: hoursConfigured,
      establishment_name: est.rows[0]?.name || null,
    });
  })
);

router.get(
  '/closed-dates',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const settings = await ReservationClosedDatesModel.get(establishmentId);
    return res.json(settings);
  })
);

router.put(
  '/closed-dates/:date',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const dateKey = String(req.params.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      throw new ValidationError('Date invalide (attendu YYYY-MM-DD)');
    }
    if (typeof req.body.closed !== 'boolean') {
      throw new ValidationError('closed (boolean) is required');
    }
    try {
      const settings = await ReservationClosedDatesModel.setDateClosed(
        establishmentId,
        dateKey,
        req.body.closed
      );
      return res.json(settings);
    } catch {
      throw new ValidationError('Date invalide');
    }
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const customerName = String(req.body.customer_name || '').trim();
    const startsAt = String(req.body.starts_at || '').trim();
    const partySize = Number(req.body.party_size ?? 2);
    if (!customerName) throw new ValidationError('Nom client requis');
    if (!startsAt) throw new ValidationError('Date/heure requise');
    if (!Number.isFinite(partySize) || partySize < 1) {
      throw new ValidationError('Nombre de personnes invalide');
    }
    const status =
      typeof req.body.status === 'string' && ReservationModel.isValidStatus(req.body.status)
        ? req.body.status
        : 'requested';
    const statusReason =
      req.body.status_reason != null
        ? String(req.body.status_reason).trim() || null
        : req.body.commentaire != null
          ? String(req.body.commentaire).trim() || null
          : null;

    const reservation = await ReservationModel.create({
      establishment_id: establishmentId,
      customer_name: customerName,
      customer_email: req.body.customer_email ? String(req.body.customer_email) : null,
      customer_phone: req.body.customer_phone ? String(req.body.customer_phone) : null,
      party_size: partySize,
      starts_at: startsAt,
      ends_at: req.body.ends_at ? String(req.body.ends_at) : null,
      status,
      status_reason: statusReason,
      notes: req.body.notes != null ? String(req.body.notes) : null,
      source: req.body.source ? String(req.body.source) : 'manual',
      inbox_message_id: req.body.inbox_message_id ? Number(req.body.inbox_message_id) : null,
      created_by: req.user?.id ?? null,
    });

    if (reservation.customer_email) {
      const est = await pool.query(`SELECT name, slug, timezone FROM establishments WHERE id = $1`, [
        establishmentId,
      ]);
      const slug = est.rows[0]?.slug as string | undefined;
      if (slug) {
        void notifyGuestReservationStatus({
          reservation,
          establishmentName: String(est.rows[0]?.name || ''),
          establishmentSlug: slug,
          timezone: (est.rows[0]?.timezone as string) || undefined,
        });
      }
    }

    const guest_reliability = await GuestNoShowFlagModel.lookup(
      reservation.customer_email,
      reservation.customer_phone
    );
    return res.status(201).json({ reservation: { ...reservation, guest_reliability } });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = parseInt(req.params.id ?? '', 10);
    if (!Number.isFinite(id)) throw new ValidationError('Identifiant invalide');
    if (req.body.status != null && !ReservationModel.isValidStatus(String(req.body.status))) {
      throw new ValidationError('Statut invalide');
    }

    const existing = await ReservationModel.getById(establishmentId, id);
    if (!existing) throw new NotFoundError('Réservation introuvable');

    let statusReason: string | null | undefined = undefined;
    if (req.body.status_reason !== undefined) {
      statusReason = req.body.status_reason
        ? String(req.body.status_reason).trim() || null
        : null;
    } else if (req.body.commentaire !== undefined) {
      statusReason = req.body.commentaire
        ? String(req.body.commentaire).trim() || null
        : null;
    }

    const updated = await ReservationModel.update(establishmentId, id, {
      customer_name: req.body.customer_name != null ? String(req.body.customer_name) : undefined,
      customer_email:
        req.body.customer_email !== undefined
          ? req.body.customer_email
            ? String(req.body.customer_email)
            : null
          : undefined,
      customer_phone:
        req.body.customer_phone !== undefined
          ? req.body.customer_phone
            ? String(req.body.customer_phone)
            : null
          : undefined,
      party_size: req.body.party_size != null ? Number(req.body.party_size) : undefined,
      starts_at: req.body.starts_at != null ? String(req.body.starts_at) : undefined,
      ends_at:
        req.body.ends_at !== undefined
          ? req.body.ends_at
            ? String(req.body.ends_at)
            : null
          : undefined,
      status: req.body.status,
      status_reason: statusReason,
      notes: req.body.notes !== undefined ? (req.body.notes != null ? String(req.body.notes) : null) : undefined,
    });
    if (!updated) throw new NotFoundError('Réservation introuvable');

    if (updated.status !== existing.status && updated.status === 'no_show') {
      void GuestNoShowFlagModel.flagContacts({
        email: updated.customer_email,
        phone: updated.customer_phone,
        source_establishment_id: establishmentId,
        source_reservation_id: updated.id,
      });
    }

    if (updated.status !== existing.status && updated.customer_email) {
      const est = await pool.query(`SELECT name, slug, timezone FROM establishments WHERE id = $1`, [
        establishmentId,
      ]);
      const slug = est.rows[0]?.slug as string | undefined;
      if (slug) {
        void notifyReservationStatusChange({
          reservation: updated,
          previousStatus: existing.status,
          establishmentName: String(est.rows[0]?.name || ''),
          establishmentSlug: slug,
          timezone: (est.rows[0]?.timezone as string) || undefined,
        });
      }
    }

    const guest_reliability = await GuestNoShowFlagModel.lookup(
      updated.customer_email,
      updated.customer_phone
    );
    return res.json({ reservation: { ...updated, guest_reliability } });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = parseInt(req.params.id ?? '', 10);
    if (!Number.isFinite(id)) throw new ValidationError('Identifiant invalide');
    const ok = await ReservationModel.delete(establishmentId, id);
    if (!ok) throw new NotFoundError('Réservation introuvable');
    return res.json({ success: true });
  })
);

router.get(
  '/ics/token',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const result = await pool.query(
      `SELECT reservations_ics_token FROM establishments WHERE id = $1`,
      [establishmentId]
    );
    let token = result.rows[0]?.reservations_ics_token as string | undefined;
    if (!token) {
      token = randomUUID();
      await pool.query(`UPDATE establishments SET reservations_ics_token = $2 WHERE id = $1`, [
        establishmentId,
        token,
      ]);
    }
    const base = (process.env.PUBLIC_API_URL || process.env.APP_URL || '').replace(/\/$/, '');
    return res.json({
      token,
      url: base ? `${base}/api/public/ics/reservations/${token}.ics` : `/api/public/ics/reservations/${token}.ics`,
    });
  })
);

router.post(
  '/ics/rotate',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const token = randomUUID();
    await pool.query(`UPDATE establishments SET reservations_ics_token = $2 WHERE id = $1`, [
      establishmentId,
      token,
    ]);
    const base = (process.env.PUBLIC_API_URL || process.env.APP_URL || '').replace(/\/$/, '');
    return res.json({
      token,
      url: base ? `${base}/api/public/ics/reservations/${token}.ics` : `/api/public/ics/reservations/${token}.ics`,
    });
  })
);

export default router;
