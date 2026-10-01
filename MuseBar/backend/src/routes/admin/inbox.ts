import express from 'express';
import { getEstablishmentId, requireAuth, requireEstablishmentAdminOrPermission } from '../auth';
import { P } from '../../permissions/registry';
import { asyncHandler, NotFoundError, ValidationError, AppError } from '../../middleware/errorHandler';
import { InboxModel } from '../../models/inbox';
import { listInboxConversations } from '../../models/inboxConversations';
import { AdminDocumentModel } from '../../models/adminDocument';
import { pool } from '../../db/pool';
import { getEnvironmentConfig } from '../../config/environment';
import { EmailService } from '../../services/email/EmailService';
import { Logger } from '../../utils/logger';
import {
  getPresignedDownloadUrl,
  ObjectStorageNotConfiguredError,
} from '../../services/storage/objectStorage';
import { ReservationModel } from '../../models/reservation';
import { GuestNoShowFlagModel } from '../../models/guestNoShowFlag';
import { venueInboxReservationReplyTo } from '../../services/reservations/venueInboxAddress';
import { recordOutboundReservationEmail } from '../../services/reservations/recordOutboundReservationEmail';
import { resolveVenueContactEmail } from '../../services/establishment/venueContactEmail';
import { resolveInboxReplyRecipient } from '../../services/reservations/resolveInboxReplyRecipient';

const router = express.Router();
router.use(requireAuth, requireEstablishmentAdminOrPermission(P.access_inbox));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const archived = req.query.archived === 'true';
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;
    const offset = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) : 0;
    const data = await listInboxConversations(establishmentId, {
      archived,
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
    });
    const est = await pool.query(
      `SELECT slug, admin_inbox_autoforward FROM establishments WHERE id = $1`,
      [establishmentId]
    );
    const contactEmail = await resolveVenueContactEmail(establishmentId);
    return res.json({
      conversations: data.conversations,
      total: data.total,
      inbox_address: est.rows[0]?.slug ? `${est.rows[0].slug}@mosehxl.com` : null,
      autoforward: est.rows[0]?.admin_inbox_autoforward ?? true,
      owner_email: contactEmail,
      contact_email: contactEmail,
    });
  })
);

router.get(
  '/settings',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const est = await pool.query(
      `SELECT slug, admin_inbox_autoforward FROM establishments WHERE id = $1`,
      [establishmentId]
    );
    if (!est.rows[0]) throw new NotFoundError('Établissement introuvable');
    const contactEmail = await resolveVenueContactEmail(establishmentId);
    return res.json({
      inbox_address: est.rows[0].slug ? `${est.rows[0].slug}@mosehxl.com` : null,
      autoforward: est.rows[0].admin_inbox_autoforward,
      owner_email: contactEmail,
      contact_email: contactEmail,
    });
  })
);

router.put(
  '/settings',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    if (typeof req.body.autoforward !== 'boolean') {
      throw new ValidationError('autoforward (boolean) is required');
    }
    const result = await pool.query(
      `UPDATE establishments SET admin_inbox_autoforward = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING slug, admin_inbox_autoforward`,
      [establishmentId, req.body.autoforward]
    );
    const contactEmail = await resolveVenueContactEmail(establishmentId);
    return res.json({
      inbox_address: result.rows[0]?.slug ? `${result.rows[0].slug}@mosehxl.com` : null,
      autoforward: result.rows[0]?.admin_inbox_autoforward,
      owner_email: contactEmail,
      contact_email: contactEmail,
    });
  })
);

router.get(
  '/by-reservation/:reservationId',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const reservationId = parseInt(req.params.reservationId ?? '', 10);
    if (!Number.isFinite(reservationId)) throw new ValidationError('Identifiant invalide');
    const hit = await InboxModel.findLatestForReservation(establishmentId, reservationId);
    if (!hit) {
      const reservation = await ReservationModel.getById(establishmentId, reservationId);
      if (reservation?.inbox_message_id) {
        const message = await InboxModel.getMessage(establishmentId, reservation.inbox_message_id);
        if (message) {
          return res.json({
            message_id: message.id,
            is_archived: message.is_archived,
            reservation_id: reservationId,
          });
        }
      }
      throw new NotFoundError('Aucune conversation pour cette réservation');
    }
    return res.json({
      message_id: hit.id,
      is_archived: hit.is_archived,
      reservation_id: reservationId,
    });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = parseInt(req.params.id ?? '', 10);
    if (!Number.isFinite(id)) throw new ValidationError('Identifiant invalide');
    const message = await InboxModel.getMessage(establishmentId, id);
    if (!message) throw new NotFoundError('Message introuvable');

    let reservation =
      message.reservation_id != null
        ? await ReservationModel.getById(establishmentId, message.reservation_id)
        : null;
    if (!reservation) {
      reservation = await ReservationModel.findByInboxMessageId(establishmentId, id);
    }
    if (!reservation) {
      const emailMatch = String(message.from_address || '').match(/[\w.+-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        reservation = await ReservationModel.findLatestOpenByEmail(
          establishmentId,
          emailMatch[0]
        );
      }
    }

    if (reservation?.id != null) {
      await InboxModel.markThreadRead(establishmentId, reservation.id);
    } else {
      await InboxModel.markRead(establishmentId, id, true);
    }

    const thread =
      reservation?.id != null
        ? await InboxModel.listByReservation(establishmentId, reservation.id)
        : [message];

    let guest_reliability = null;
    if (reservation) {
      guest_reliability = await GuestNoShowFlagModel.lookup(
        reservation.customer_email,
        reservation.customer_phone
      );
    } else {
      const emailMatch = String(message.from_address || '').match(/[\w.+-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        guest_reliability = await GuestNoShowFlagModel.lookup(emailMatch[0], null);
      }
    }
    return res.json({
      message: { ...message, is_read: true },
      thread: thread.map((m) => ({ ...m, is_read: true })),
      reservation: reservation
        ? {
            id: reservation.id,
            status: reservation.status,
            customer_name: reservation.customer_name,
            customer_email: reservation.customer_email,
            customer_phone: reservation.customer_phone,
            party_size: reservation.party_size,
            starts_at: reservation.starts_at,
            status_reason: reservation.status_reason,
            notes: reservation.notes,
            guest_reliability,
          }
        : null,
      guest_reliability,
    });
  })
);

router.post(
  '/:id/archive',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = parseInt(req.params.id ?? '', 10);
    if (!Number.isFinite(id)) throw new ValidationError('Identifiant invalide');
    const archived = req.body?.archived !== false;
    const message = await InboxModel.getMessage(establishmentId, id);
    if (!message) throw new NotFoundError('Message introuvable');
    if (message.reservation_id != null) {
      await InboxModel.setArchivedForReservation(
        establishmentId,
        message.reservation_id,
        archived
      );
    } else {
      await InboxModel.setArchived(establishmentId, id, archived);
    }
    return res.json({ success: true, archived });
  })
);

router.post(
  '/attachments/:attachmentId/import',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const attachmentId = parseInt(req.params.attachmentId ?? '', 10);
    if (!Number.isFinite(attachmentId)) throw new ValidationError('Identifiant invalide');
    const attachment = await InboxModel.getAttachment(establishmentId, attachmentId);
    if (!attachment) throw new NotFoundError('Pièce jointe introuvable');

    const title = String(req.body.title || attachment.file_name).trim();
    const category = String(req.body.category || 'autre').trim();
    const expiresAt =
      typeof req.body.expires_at === 'string' && req.body.expires_at
        ? req.body.expires_at
        : null;

    const doc = await AdminDocumentModel.create({
      establishment_id: establishmentId,
      title,
      category,
      storage_key: attachment.storage_key,
      file_name: attachment.file_name,
      mime_type: attachment.mime_type,
      size_bytes: attachment.size_bytes,
      expires_at: expiresAt,
      source: 'email',
      uploaded_by: req.user?.id ?? null,
    });
    await InboxModel.markAttachmentImported(establishmentId, attachmentId, doc.id);
    return res.status(201).json({ document: doc });
  })
);

router.get(
  '/attachments/:attachmentId/download-url',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const attachmentId = parseInt(req.params.attachmentId ?? '', 10);
    if (!Number.isFinite(attachmentId)) throw new ValidationError('Identifiant invalide');
    const attachment = await InboxModel.getAttachment(establishmentId, attachmentId);
    if (!attachment) throw new NotFoundError('Pièce jointe introuvable');
    try {
      const url = await getPresignedDownloadUrl(attachment.storage_key, 300);
      return res.json({ url, file_name: attachment.file_name, expires_in: 300 });
    } catch (error) {
      if (error instanceof ObjectStorageNotConfiguredError) {
        throw new AppError(error.message, 503, 'OBJECT_STORAGE_NOT_CONFIGURED');
      }
      throw error;
    }
  })
);

router.post(
  '/:id/reply',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = parseInt(req.params.id ?? '', 10);
    if (!Number.isFinite(id)) throw new ValidationError('Identifiant invalide');
    const body = String(req.body.body || '').trim();
    if (!body) throw new ValidationError('Corps du message requis');

    const message = await InboxModel.getMessage(establishmentId, id);
    if (!message) throw new NotFoundError('Message introuvable');

    const est = await pool.query(`SELECT slug, name FROM establishments WHERE id = $1`, [
      establishmentId,
    ]);
    const slug = est.rows[0]?.slug as string | undefined;
    if (!slug) throw new AppError('Slug établissement manquant', 500, 'ESTABLISHMENT_SLUG_MISSING');

    const fromAddress = `${slug}@mosehxl.com`;

    let reservationId = message.reservation_id;
    if (reservationId == null) {
      const bySeed = await ReservationModel.findByInboxMessageId(establishmentId, id);
      reservationId = bySeed?.id ?? null;
    }

    const reservation =
      reservationId != null
        ? await ReservationModel.getById(establishmentId, reservationId)
        : null;
    const thread =
      reservationId != null
        ? await InboxModel.listByReservation(establishmentId, reservationId)
        : [message];

    const toAddress = resolveInboxReplyRecipient({
      message,
      reservationEmail: reservation?.customer_email,
      thread,
    });
    if (!toAddress) {
      throw new ValidationError(
        'Adresse client introuvable — vérifiez l’e-mail de la réservation (ne pas répondre à un message « établissement » sans client lié).'
      );
    }

    const replyTo =
      reservationId != null
        ? venueInboxReservationReplyTo(slug, reservationId)
        : fromAddress;

    const emailService = EmailService.getInstance(getEnvironmentConfig(), Logger.getInstance());
    try {
      await emailService.sendEmail({
        to: toAddress,
        from: fromAddress,
        replyTo,
        subject: message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`,
        text: body,
        html: `<pre style="font-family:sans-serif;white-space:pre-wrap">${body
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</pre>`,
      });
    } catch (error) {
      throw new AppError(
        error instanceof Error ? error.message : "Échec de l'envoi de la réponse",
        502,
        'EMAIL_SEND_FAILED'
      );
    }

    Logger.getInstance().info(
      'Inbox staff reply sent to guest',
      {
        establishmentId,
        messageId: id,
        reservationId,
        to: toAddress,
        from: fromAddress,
        replyTo,
      },
      'INBOX_REPLY'
    );

    if (reservationId != null) {
      await recordOutboundReservationEmail({
        establishmentId,
        establishmentSlug: slug,
        reservationId,
        toAddress,
        subject: message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`,
        textBody: body,
      });
    } else {
      await InboxModel.createMessage({
        establishment_id: establishmentId,
        from_address: fromAddress,
        to_address: toAddress,
        subject: message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`,
        text_body: body,
        direction: 'outbound',
      });
    }

    return res.json({
      success: true,
      to: toAddress,
      from: fromAddress,
      reply_to: replyTo,
    });
  })
);

export default router;
