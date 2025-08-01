/**
 * Email Sender
 * Handles core email sending functionality and provider configuration
 */

import sgMail from '@sendgrid/mail';
import { Logger } from '../../utils/logger';
import { EnvironmentConfig } from '../../config/environment';

/**
 * Email sending options
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
  }>;
  trackingId?: string;
}

/**
 * Email configuration validation result
 */
export interface EmailConfigValidation {
  isValid: boolean;
  issues: string[];
}

/**
 * Email Sender Class
 */
export class EmailSender {
  private logger: Logger;
  private config: EnvironmentConfig;
  private isConfigured: boolean = false;

  constructor(config: EnvironmentConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.initializeEmailProvider();
  }

  /**
   * Initialize email provider (SendGrid)
   */
  private initializeEmailProvider(): void {
    try {
      const apiKey = process.env.SENDGRID_API_KEY;
      
      if (!apiKey) {
        this.logger.warn(
          'SendGrid API key not configured. Email service will be disabled.',
          {},
          'EMAIL_SENDER'
        );
        return;
      }

      sgMail.setApiKey(apiKey);
      this.isConfigured = true;

      this.logger.info(
        'Email sender initialized successfully',
        { provider: 'SendGrid' },
        'EMAIL_SENDER'
      );
    } catch (error) {
      this.logger.error(
        'Failed to initialize email sender',
        error as Error,
        {},
        'EMAIL_SENDER'
      );
    }
  }

  /**
   * Send email through provider
   */
  public async sendEmail(options: EmailOptions): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.isConfigured) {
      throw new Error('Email service not configured. Please set SENDGRID_API_KEY.');
    }

    try {
      const msg = {
        to: options.to,
        from: options.from || process.env.FROM_EMAIL || 'noreply@musebar.com',
        replyTo: options.replyTo,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
        customArgs: {
          trackingId: options.trackingId || '',
        },
      };

      const response = await sgMail.send(msg);
      const messageId = response[0].headers['x-message-id'];

      this.logger.info(
        'Email sent successfully via provider',
        {
          trackingId: options.trackingId,
          recipients: Array.isArray(options.to) ? options.to.length : 1,
          subject: options.subject,
          messageId,
        },
        'EMAIL_SENDER'
      );

      return {
        success: true,
        messageId
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        'Failed to send email via provider',
        error as Error,
        {
          trackingId: options.trackingId,
          recipients: Array.isArray(options.to) ? options.to.length : 1,
          subject: options.subject,
        },
        'EMAIL_SENDER'
      );

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Validate email configuration
   */
  public validateConfiguration(): EmailConfigValidation {
    const issues: string[] = [];

    if (!process.env.SENDGRID_API_KEY) {
      issues.push('SENDGRID_API_KEY environment variable not set');
    }

    if (!process.env.FROM_EMAIL) {
      issues.push('FROM_EMAIL environment variable not set');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Test email configuration by sending a test email
   */
  public async testConfiguration(testEmail: string): Promise<boolean> {
    try {
      const result = await this.sendEmail({
        to: testEmail,
        subject: 'MuseBar Email Service Test',
        html: '<h1>Email Service Test</h1><p>This is a test email to verify your email configuration is working correctly.</p>',
        text: 'Email Service Test\n\nThis is a test email to verify your email configuration is working correctly.',
      });

      return result.success;
    } catch (error) {
      this.logger.error(
        'Email configuration test failed',
        error as Error,
        { testEmail },
        'EMAIL_SENDER'
      );
      return false;
    }
  }

  /**
   * Check if email service is properly configured
   */
  public isEmailServiceConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Get default sender email
   */
  public getDefaultSenderEmail(): string {
    return process.env.FROM_EMAIL || 'noreply@musebar.com';
  }
}