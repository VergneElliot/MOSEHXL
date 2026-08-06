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

    return res.json({
      sendgrid_configured: emailService.isConfigured(),
      from_email: fromEmail,
      from_email_env_set: Boolean(process.env.FROM_EMAIL?.trim()),
      inbound_webhook_token_set: inboundTokenSet,
      object_storage_configured: isObjectStorageConfigured(),
      validation,
      notes: [
        'Domain Authentication (SPF/DKIM) for mosehxl.com is required to send as slug@mosehxl.com.',
        'Inbound Parse MX + webhook required for slug@mosehxl.com replies to land in Boîte mail.',
      ],
    });
  })
);

export default router;
