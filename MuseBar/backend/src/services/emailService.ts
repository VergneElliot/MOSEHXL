/**
 * Professional Email Service
 * Handles all email communications with template management and delivery tracking
 */

import sgMail from '@sendgrid/mail';
import { randomUUID } from 'crypto';
import { Logger } from '../utils/logger';
import { EnvironmentConfig } from '../config/environment';

/**
 * Email template interface
 */
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables: string[];
}

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
  templateData?: Record<string, any>;
  trackingId?: string;
}

/**
 * Email status tracking
 */
export interface EmailLog {
  id: string;
  recipientEmail: string;
  templateName?: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'bounced';
  providerMessageId?: string;
  errorMessage?: string;
  sentAt?: Date;
  createdAt: Date;
}

/**
 * Professional Email Service Class
 */
export class EmailService {
  private static instance: EmailService;
  private logger: Logger;
  private config: EnvironmentConfig;
  private isConfigured: boolean = false;
  private emailLogs: Map<string, EmailLog> = new Map();

  // Built-in email templates
  private templates: Map<string, EmailTemplate> = new Map();

  private constructor(config: EnvironmentConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.initializeEmailService();
    this.loadBuiltInTemplates();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: EnvironmentConfig, logger?: Logger): EmailService {
    if (!EmailService.instance && config && logger) {
      EmailService.instance = new EmailService(config, logger);
    }
    return EmailService.instance;
  }

  /**
   * Initialize email service with provider
   */
  private initializeEmailService(): void {
    try {
      const apiKey = process.env.SENDGRID_API_KEY;
      
      if (!apiKey) {
        this.logger.warn(
          'SendGrid API key not configured. Email service will be disabled.',
          {},
          'EMAIL_SERVICE'
        );
        return;
      }

      sgMail.setApiKey(apiKey);
      this.isConfigured = true;

      this.logger.info(
        'Email service initialized successfully',
        { provider: 'SendGrid' },
        'EMAIL_SERVICE'
      );
    } catch (error) {
      this.logger.error(
        'Failed to initialize email service',
        error as Error,
        {},
        'EMAIL_SERVICE'
      );
    }
  }

  /**
   * Load built-in email templates
   */
  private loadBuiltInTemplates(): void {
    // User invitation template
    this.templates.set('user_invitation', {
      id: 'user_invitation',
      name: 'User Invitation',
      subject: 'Invitation to join {{establishmentName}} - MuseBar POS',
      variables: ['recipientName', 'establishmentName', 'inviterName', 'invitationUrl', 'expirationDate'],
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>User Invitation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { 
            display: inline-block; 
            background: #4caf50; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px;
            font-weight: bold;
        }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍺 MuseBar POS System</h1>
        </div>
        <div class="content">
            <h2>You've been invited!</h2>
            <p>Hello {{recipientName}},</p>
            <p>{{inviterName}} has invited you to join <strong>{{establishmentName}}</strong> on the MuseBar POS system.</p>
            
            <p>Click the button below to accept your invitation and set up your account:</p>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="{{invitationUrl}}" class="button">Accept Invitation</a>
            </p>
            
            <p><strong>Important:</strong> This invitation expires on {{expirationDate}}.</p>
            
            <p>If you have any questions, please contact your manager or system administrator.</p>
            
            <p>Best regards,<br>The MuseBar Team</p>
        </div>
        <div class="footer">
            <p>© 2025 MuseBar POS System. All rights reserved.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>`,
      textBody: `
You've been invited to join {{establishmentName}} - MuseBar POS

Hello {{recipientName}},

{{inviterName}} has invited you to join {{establishmentName}} on the MuseBar POS system.

Please visit the following link to accept your invitation and set up your account:
{{invitationUrl}}

Important: This invitation expires on {{expirationDate}}.

If you have any questions, please contact your manager or system administrator.

Best regards,
The MuseBar Team

© 2025 MuseBar POS System. All rights reserved.
If you didn't expect this invitation, you can safely ignore this email.
`
    });

    // Password reset template
    this.templates.set('password_reset', {
      id: 'password_reset',
      name: 'Password Reset',
      subject: 'Reset your MuseBar password',
      variables: ['recipientName', 'resetUrl', 'expirationTime'],
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { 
            display: inline-block; 
            background: #ff5722; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px;
            font-weight: bold;
        }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset</h1>
        </div>
        <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hello {{recipientName}},</p>
            <p>We received a request to reset your password for your MuseBar account.</p>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="{{resetUrl}}" class="button">Reset Password</a>
            </p>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul>
                    <li>This link expires in {{expirationTime}}</li>
                    <li>The link can only be used once</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                </ul>
            </div>
            
            <p>For security reasons, we recommend choosing a strong password that includes:</p>
            <ul>
                <li>At least 8 characters</li>
                <li>Mix of uppercase and lowercase letters</li>
                <li>Numbers and special characters</li>
            </ul>
            
            <p>Best regards,<br>The MuseBar Team</p>
        </div>
        <div class="footer">
            <p>© 2025 MuseBar POS System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
      textBody: `
Reset Your MuseBar Password

Hello {{recipientName}},

We received a request to reset your password for your MuseBar account.

Please visit the following link to reset your password:
{{resetUrl}}

Security Notice:
- This link expires in {{expirationTime}}
- The link can only be used once
- If you didn't request this reset, please ignore this email

For security reasons, we recommend choosing a strong password that includes:
- At least 8 characters
- Mix of uppercase and lowercase letters  
- Numbers and special characters

Best regards,
The MuseBar Team

© 2025 MuseBar POS System. All rights reserved.
`
    });

    // Email verification template
    this.templates.set('email_verification', {
      id: 'email_verification',
      name: 'Email Verification',
      subject: 'Verify your email address - MuseBar POS',
      variables: ['recipientName', 'verificationUrl', 'establishmentName'],
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Email Verification</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4caf50; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { 
            display: inline-block; 
            background: #2196f3; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px;
            font-weight: bold;
        }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✉️ Verify Your Email</h1>
        </div>
        <div class="content">
            <h2>Welcome to MuseBar!</h2>
            <p>Hello {{recipientName}},</p>
            <p>Welcome to <strong>{{establishmentName}}</strong>! To complete your account setup, please verify your email address.</p>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
            </p>
            
            <p>This verification link will expire in 24 hours for security reasons.</p>
            
            <p>Once verified, you'll have full access to your MuseBar account features.</p>
            
            <p>Best regards,<br>The MuseBar Team</p>
        </div>
        <div class="footer">
            <p>© 2025 MuseBar POS System. All rights reserved.</p>
            <p>If you didn't create this account, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>`,
      textBody: `
Welcome to MuseBar - Verify Your Email

Hello {{recipientName}},

Welcome to {{establishmentName}}! To complete your account setup, please verify your email address.

Please visit the following link to verify your email:
{{verificationUrl}}

This verification link will expire in 24 hours for security reasons.

Once verified, you'll have full access to your MuseBar account features.

Best regards,
The MuseBar Team

© 2025 MuseBar POS System. All rights reserved.
If you didn't create this account, you can safely ignore this email.
`
    });

    this.logger.info(
      'Built-in email templates loaded',
      { templateCount: this.templates.size },
      'EMAIL_SERVICE'
    );
  }

  /**
   * Send email using template
   */
  public async sendTemplateEmail(
    templateName: string,
    to: string,
    templateData: Record<string, any>,
    options: Partial<EmailOptions> = {}
  ): Promise<string> {
    const template = this.templates.get(templateName);
    
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    // Replace template variables
    const subject = this.replaceTemplateVariables(template.subject, templateData);
    const htmlBody = this.replaceTemplateVariables(template.htmlBody, templateData);
    const textBody = template.textBody 
      ? this.replaceTemplateVariables(template.textBody, templateData)
      : undefined;

    return this.sendEmail({
      to,
      subject,
      html: htmlBody,
      text: textBody,
      ...options
    });
  }

  /**
   * Send basic email
   */
  public async sendEmail(options: EmailOptions): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Email service not configured. Please set SENDGRID_API_KEY.');
    }

    const trackingId = options.trackingId || randomUUID();
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    // Create email log
    const emailLog: EmailLog = {
      id: trackingId,
      recipientEmail: recipients.join(', '),
      subject: options.subject,
      status: 'pending',
      createdAt: new Date(),
    };

    this.emailLogs.set(trackingId, emailLog);

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
          trackingId: trackingId,
        },
      };

      const response = await sgMail.send(msg);
      
      // Update email log
      emailLog.status = 'sent';
      emailLog.sentAt = new Date();
      emailLog.providerMessageId = response[0].headers['x-message-id'];

      this.logger.info(
        'Email sent successfully',
        {
          trackingId,
          recipients: recipients.length,
          subject: options.subject,
          messageId: emailLog.providerMessageId,
        },
        'EMAIL_SERVICE'
      );

      return trackingId;

    } catch (error) {
      // Update email log with error
      emailLog.status = 'failed';
      emailLog.errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        'Failed to send email',
        error as Error,
        {
          trackingId,
          recipients: recipients.length,
          subject: options.subject,
        },
        'EMAIL_SERVICE'
      );

      throw error;
    }
  }

  /**
   * Replace template variables in text
   */
  private replaceTemplateVariables(text: string, data: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  /**
   * Get email status
   */
  public getEmailStatus(trackingId: string): EmailLog | null {
    return this.emailLogs.get(trackingId) || null;
  }

  /**
   * Get available templates
   */
  public getAvailableTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Add custom template
   */
  public addTemplate(template: EmailTemplate): void {
    this.templates.set(template.id, template);
    
    this.logger.info(
      'Custom email template added',
      { templateId: template.id, templateName: template.name },
      'EMAIL_SERVICE'
    );
  }

  /**
   * Validate email configuration
   */
  public validateConfiguration(): { isValid: boolean; issues: string[] } {
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
   * Test email configuration
   */
  public async testConfiguration(testEmail: string): Promise<boolean> {
    try {
      await this.sendEmail({
        to: testEmail,
        subject: 'MuseBar Email Service Test',
        html: '<h1>Email Service Test</h1><p>This is a test email to verify your email configuration is working correctly.</p>',
        text: 'Email Service Test\n\nThis is a test email to verify your email configuration is working correctly.',
      });

      return true;
    } catch (error) {
      this.logger.error(
        'Email configuration test failed',
        error as Error,
        { testEmail },
        'EMAIL_SERVICE'
      );
      return false;
    }
  }

  /**
   * Get email statistics
   */
  public getEmailStats(): {
    totalEmails: number;
    sentEmails: number;
    failedEmails: number;
    pendingEmails: number;
  } {
    const logs = Array.from(this.emailLogs.values());
    
    return {
      totalEmails: logs.length,
      sentEmails: logs.filter(log => log.status === 'sent').length,
      failedEmails: logs.filter(log => log.status === 'failed').length,
      pendingEmails: logs.filter(log => log.status === 'pending').length,
    };
  }
} 