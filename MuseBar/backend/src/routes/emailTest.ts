/**
 * Email Test Routes
 * Development-only endpoints for testing email functionality.
 * All routes require authentication and admin role so only authorized users can send test emails or view config/logs.
 */

import { Router } from 'express';
import { EmailService } from '../services/email/EmailService';
import { Logger } from '../utils/logger';
import { getEnvironmentConfig } from '../config/environment';
import { requireAuth, requireAdmin } from './auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';

const router = Router();
const config = getEnvironmentConfig();
const logger = Logger.getInstance(config);

/**
 * Test email configuration
 * POST /api/test-email
 * Requires: authenticated, admin.
 */
router.post('/test-email', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  try {
    const { to, subject = 'MuseBar Email Test', message = 'This is a test email from MuseBar V2 Development' } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    // Get email service instance
    const emailService = EmailService.getInstance();
    
    if (!emailService.isConfigured()) {
      throw new AppError(
        'Email service not configured. Check SENDGRID_API_KEY and FROM_EMAIL.',
        500,
        'EMAIL_SERVICE_NOT_CONFIGURED'
      );
    }

    // Validate configuration
    const validation = emailService.validateConfiguration();
    if (!validation.isValid) {
      throw new AppError(
        'Email configuration invalid',
        500,
        'EMAIL_CONFIGURATION_INVALID',
        { issues: validation.issues }
      );
    }

    // Send test email
    const trackingId = await emailService.sendEmail({
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">MuseBar V2 Development</h2>
          <h3 style="color: #666;">Email Test</h3>
          <p style="color: #555; line-height: 1.6;">
            ${message}
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            This is a test email from MuseBar V2 Development Environment.<br>
            Sent at: ${new Date().toISOString()}
          </p>
        </div>
      `,
      text: `
MuseBar V2 Development - Email Test

${message}

---
This is a test email from MuseBar V2 Development Environment.
Sent at: ${new Date().toISOString()}
      `
    });

    logger.info('Test email sent successfully', {
      to,
      trackingId,
      subject
    }, 'EMAIL_TEST');

    res.json({
      success: true,
      message: 'Test email sent successfully',
      trackingId,
      to,
      subject
    });

  } catch (error) {
    logger.error('Failed to send test email', {
      error: error as Error,
      to: req.body.to
    }, 'EMAIL_TEST');
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'EMAIL_TEST_SEND_FAILED'
    );
  }
}));

/**
 * Get email configuration status
 * GET /api/email-status
 * Requires: authenticated, admin.
 */
router.get('/email-status', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  try {
    const emailService = EmailService.getInstance();
    
    const config = {
      isConfigured: emailService.isConfigured(),
      validation: emailService.validateConfiguration(),
      stats: emailService.getEmailStats(),
      defaultSender: process.env.FROM_EMAIL || 'Not configured'
    };

    res.json({
      success: true,
      config
    });

  } catch (error) {
    logger.error('Failed to get email status', { error: error as Error }, 'EMAIL_TEST');
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'EMAIL_STATUS_FAILED'
    );
  }
}));

/**
 * Get email logs
 * GET /api/email-logs
 * Requires: authenticated, admin.
 */
router.get('/email-logs', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  try {
    const emailService = EmailService.getInstance();
    const logs = emailService.getAllEmailLogs();

    res.json({
      success: true,
      logs: logs.slice(-10) // Return last 10 logs
    });

  } catch (error) {
    logger.error('Failed to get email logs', { error: error as Error }, 'EMAIL_TEST');
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'EMAIL_LOGS_FAILED'
    );
  }
}));

export default router; 