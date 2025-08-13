/**
 * Email Test Routes
 * Development-only endpoints for testing email functionality
 */

import { Router } from 'express';
import { EmailService } from '../services/email/EmailService';
import { Logger } from '../utils/logger';
import { getEnvironmentConfig } from '../config/environment';

const router = Router();
const config = getEnvironmentConfig();
const logger = Logger.getInstance(config);

/**
 * Test email configuration
 * POST /api/test-email
 */
router.post('/test-email', async (req, res) => {
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
      return res.status(500).json({
        success: false,
        error: 'Email service not configured. Check SENDGRID_API_KEY and FROM_EMAIL.'
      });
    }

    // Validate configuration
    const validation = emailService.validateConfiguration();
    if (!validation.isValid) {
      return res.status(500).json({
        success: false,
        error: 'Email configuration invalid',
        issues: validation.issues
      });
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
    logger.error('Failed to send test email', error as Error, {
      to: req.body.to
    }, 'EMAIL_TEST');

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * Get email configuration status
 * GET /api/email-status
 */
router.get('/email-status', async (req, res) => {
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
    logger.error('Failed to get email status', error as Error, {}, 'EMAIL_TEST');

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * Get email logs
 * GET /api/email-logs
 */
router.get('/email-logs', async (req, res) => {
  try {
    const emailService = EmailService.getInstance();
    const logs = emailService.getAllEmailLogs();

    res.json({
      success: true,
      logs: logs.slice(-10) // Return last 10 logs
    });

  } catch (error) {
    logger.error('Failed to get email logs', error as Error, {}, 'EMAIL_TEST');

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router; 