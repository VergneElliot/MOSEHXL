import express from 'express';
import { getEstablishmentId, requireAuth, requireEstablishmentAdminOrPermission } from '../auth';
import { P } from '../../permissions/registry';
import { asyncHandler, NotFoundError, ValidationError, AppError } from '../../middleware/errorHandler';
import { InboxModel } from '../../models/inbox';
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
    const data = await InboxModel.list(establishmentId, {
      archived,
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
    });
    const est = await pool.query(
      `SELECT slug, email, admin_inbox_autoforward FROM establishments WHERE id = $1`,
      [establishmentId]
    );
    return res.json({
      ...data,
      inbox_address: est.rows[0]?.slug ? `${est.rows[0].slug}@mosehxl.com` : null,
      autoforward: est.rows[0]?.admin_inbox_autoforward ?? true,
      owner_email: est.rows[0]?.email ?? null,
    });
  })
);

router.get(
  '/settings',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const est = await pool.query(
      `SELECT slug, email, admin_inbox_autoforward FROM establishments WHERE id = $1`,
      [establishmentId]
    );
    if (!est.rows[0]) throw new NotFoundError('Établissement introuvable');
    return res.json({
      inbox_address: est.rows[0].slug ? `${est.rows[0].slug}@mosehxl.com` : null,
      autoforward: est.rows[0].admin_inbox_autoforward,
      owner_email: est.rows[0].email,
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
       RETURNING slug, email, admin_inbox_autoforward`,
      [establishmentId, req.body.autoforward]
    );
    return res.json({
      inbox_address: result.rows[0]?.slug ? `${result.rows[0].slug}@mosehxl.com` : null,
      autoforward: result.rows[0]?.admin_inbox_autoforward,
      owner_email: result.rows[0]?.email,
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
    await InboxModel.markRead(establishmentId, id, true);
    let reservation = await ReservationModel.findByInboxMessageId(establishmentId, id);
    if (!reservation) {
      const emailMatch = String(message.from_address || '').match(/[\w.+-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        reservation = await ReservationModel.findLatestOpenByEmail(
          establishmentId,
          emailMatch[0]
        );
      }
    }
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
    const ok = await InboxModel.setArchived(establishmentId, id, archived);
    if (!ok) throw new NotFoundError('Message introuvable');
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
    const toMatch = String(message.from_address || '').match(
      /[\w.+-]+@[\w.-]+\.\w+/
    );
    const toAddress = toMatch?.[0];
    if (!toAddress) {
      throw new ValidationError('Adresse destinataire introuvable dans le message');
    }

    const emailService = EmailService.getInstance(getEnvironmentConfig(), Logger.getInstance());
    try {
      await emailService.sendEmail({
        to: toAddress,
        from: fromAddress,
        replyTo: fromAddress,
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

    return res.json({ success: true, from: fromAddress });
  })
);

export default router;
