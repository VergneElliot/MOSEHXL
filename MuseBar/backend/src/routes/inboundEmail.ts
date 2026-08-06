/**
 * SendGrid Inbound Parse webhook.
 * POST /api/inbound-email/:token
 */

import express from 'express';
import multer from 'multer';
import { pool } from '../db/pool';
import { runWithTenantContext } from '../rls/tenantContext';
import { InboxModel } from '../models/inbox';
import {
  buildEstablishmentObjectKey,
  isObjectStorageConfigured,
  putObject,
} from '../services/storage/objectStorage';
import { Logger } from '../utils/logger';
import { getEnvironmentConfig } from '../config/environment';
import { EmailService } from '../services/email/EmailService';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 20 },
});

function extractLocalPart(rawTo: string): string | null {
  const match = String(rawTo || '')
    .toLowerCase()
    .match(/([a-z][a-z0-9]{0,63})@mosehxl\.com/);
  return match?.[1] ?? null;
}

function stripHtml(html: string): string {
  return String(html || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

router.post(
  '/:token',
  upload.any(),
  asyncHandler(async (req, res) => {
    const expected = process.env.INBOUND_EMAIL_WEBHOOK_TOKEN?.trim();
    if (!expected || req.params.token !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const to = String(req.body.to || req.body.envelope || '');
    const from = String(req.body.from || '');
    const subject = String(req.body.subject || '');
    const text = typeof req.body.text === 'string' ? req.body.text : null;
    const html = typeof req.body.html === 'string' ? stripHtml(req.body.html) : null;
    // SendGrid may send headers with mixed newlines; avoid swallowing the whole blob.
    let messageId: string | null = null;
    if (typeof req.body.headers === 'string') {
      const match = req.body.headers.match(/Message-ID:\s*([^\r\n]+)/i);
      const raw = match?.[1]?.trim() ?? null;
      messageId = raw ? raw.slice(0, 998) : null;
    }

    const slug = extractLocalPart(to);
    if (!slug) {
      Logger.getInstance().warn('Inbound email ignored — unknown recipient', { to }, 'INBOUND_EMAIL');
      return res.status(200).json({ ok: true, ignored: true });
    }

    const est = await pool.query(
      `SELECT id, email, admin_inbox_autoforward, name FROM establishments WHERE slug = $1`,
      [slug]
    );
    const establishment = est.rows[0] as
      | { id: string; email: string; admin_inbox_autoforward: boolean; name: string }
      | undefined;
    if (!establishment) {
      Logger.getInstance().warn('Inbound email ignored — no establishment for slug', { slug }, 'INBOUND_EMAIL');
      return res.status(200).json({ ok: true, ignored: true });
    }

    await runWithTenantContext({ establishmentId: establishment.id }, async () => {
      const message = await InboxModel.createMessage({
        establishment_id: establishment.id,
        message_id: messageId,
        from_address: from,
        to_address: `${slug}@mosehxl.com`,
        subject,
        text_body: text,
        html_body: html,
      });

      const files = Array.isArray(req.files) ? req.files : [];
      if (isObjectStorageConfigured()) {
        for (const file of files) {
          if (!file?.buffer) continue;
          const key = buildEstablishmentObjectKey(
            establishment.id,
            'inbox',
            file.originalname || 'attachment'
          );
          await putObject({
            key,
            body: file.buffer,
            contentType: file.mimetype || 'application/octet-stream',
          });
          await InboxModel.addAttachment({
            establishment_id: establishment.id,
            message_id: message.id,
            file_name: file.originalname || 'attachment',
            mime_type: file.mimetype || 'application/octet-stream',
            size_bytes: file.size,
            storage_key: key,
          });
        }
      } else if (files.length > 0) {
        Logger.getInstance().warn(
          'Inbound attachments skipped — object storage not configured',
          { establishmentId: establishment.id, count: files.length },
          'INBOUND_EMAIL'
        );
      }

      if (establishment.admin_inbox_autoforward && establishment.email) {
        try {
          const emailService = EmailService.getInstance(
            getEnvironmentConfig(),
            Logger.getInstance()
          );
          await emailService.sendEmail({
            to: establishment.email,
            subject: `[${establishment.name}] ${subject || '(sans objet)'}`,
            text: `Nouveau message reçu sur ${slug}@mosehxl.com\nDe: ${from}\n\n${text || ''}`,
            html: `<p>Nouveau message reçu sur <strong>${slug}@mosehxl.com</strong></p>
                   <p><strong>De:</strong> ${from}</p>
                   <p><strong>Sujet:</strong> ${subject || '(sans objet)'}</p>
                   <hr/>
                   <pre style="white-space:pre-wrap;font-family:sans-serif">${(text || '')
                     .replace(/&/g, '&amp;')
                     .replace(/</g, '&lt;')
                     .replace(/>/g, '&gt;')}</pre>`,
          });
        } catch (error) {
          Logger.getInstance().error(
            'Failed to autoforward inbound email',
            error instanceof Error ? error : new Error(String(error)),
            'INBOUND_EMAIL'
          );
        }
      }
    });

    return res.status(200).json({ ok: true });
  })
);

export default router;
