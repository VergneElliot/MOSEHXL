import express from 'express';
import { requireAuth, requireEstablishmentAdmin } from '../auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { getEnvironmentConfig } from '../../config/environment';
import { EmailService } from '../../services/email/EmailService';
import { Logger } from '../../utils/logger';
import { isObjectStorageConfigured } from '../../services/storage/objectStorage';

const router = express.Router();

router.get(
  '/',
  requireAuth,
  requireEstablishmentAdmin,
  asyncHandler(async (_req, res) => {
    const emailService = EmailService.getInstance(getEnvironmentConfig(), Logger.getInstance());
    const validation = emailService.validateConfiguration();
    const fromEmail = process.env.FROM_EMAIL || 'noreply@mosehxl.com';
    const inboundTokenSet = Boolean(
      process.env.INBOUND_EMAIL_WEBHOOK_TOKEN &&
        process.env.INBOUND_EMAIL_WEBHOOK_TOKEN.trim().length >= 16
    );
    const apiBase = (
      process.env.PUBLIC_API_URL ||
      process.env.APP_URL ||
      ''
    ).replace(/\/$/, '');

    return res.json({
      sendgrid_configured: emailService.isConfigured(),
      from_email: fromEmail,
      from_email_env_set: Boolean(process.env.FROM_EMAIL?.trim()),
      inbound_webhook_token_set: inboundTokenSet,
      inbound_parse_url_hint: apiBase
        ? `${apiBase}/api/inbound-email/<INBOUND_EMAIL_WEBHOOK_TOKEN>`
        : null,
      object_storage_configured: isObjectStorageConfigured(),
      validation,
      notes: [
        'Domain Authentication (SPF/DKIM) for mosehxl.com is required to send as slug@mosehxl.com.',
        'MX for mosehxl.com must point to mx.sendgrid.net (currently expected).',
        'SendGrid Activity shows OUTBOUND mail only — inbound replies never appear there.',
        'Inbound Parse host mosehxl.com + destination URL must match inbound_parse_url_hint.',
        'Venue copies use Paramètres → email de contact (synced to establishments.email). Avoid dead domains like musebar.fr without MX.',
      ],
    });
  })
);

export default router;
