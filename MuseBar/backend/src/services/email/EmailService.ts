/**
 * Email Service
 * Main orchestrator for email functionality - coordinates template management,
 * email sending, and logging
 */

import { Logger } from '../../utils/logger';
import { EnvironmentConfig } from '../../config/environment';
import { EmailTemplateManager, EmailTemplate } from './EmailTemplateManager';
import { EmailLogger, EmailLog, EmailStats } from './EmailLogger';
import { EmailSender, EmailOptions, EmailConfigValidation } from './EmailSender';

/**
 * Refactored Professional Email Service Class
 */
export class EmailService {
  private static instance: EmailService;
  private logger: Logger;
  private templateManager: EmailTemplateManager;
  private emailLogger: EmailLogger;
  private emailSender: EmailSender;

  private constructor(config: EnvironmentConfig, logger: Logger) {
    this.logger = logger;
    this.templateManager = new EmailTemplateManager(logger);
    this.emailLogger = new EmailLogger(logger);
    this.emailSender = new EmailSender(config, logger);

    this.logger.info(
      'Email service initialized successfully',
      { components: ['TemplateManager', 'EmailLogger', 'EmailSender'] },
      'EMAIL_SERVICE'
    );
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
   * Send email using template
   */
  public async sendTemplateEmail(
    templateName: string,
    to: string,
    templateData: Record<string, any>,
    options: Partial<EmailOptions> = {}
  ): Promise<string> {
    // Process template
    const processedTemplate = this.templateManager.processTemplate(templateName, templateData);
    
    // Create email options
    const emailOptions: EmailOptions = {
      to,
      subject: processedTemplate.subject,
      html: processedTemplate.htmlBody,
      text: processedTemplate.textBody,
      ...options
    };

    // Create tracking log
    const trackingId = this.emailLogger.createEmailLog(
      to, 
      processedTemplate.subject, 
      templateName,
      options.trackingId
    );

    // Update email options with tracking ID
    emailOptions.trackingId = trackingId;

    try {
      // Send email
      const result = await this.emailSender.sendEmail(emailOptions);

      if (result.success) {
        // Mark as sent in logs
        this.emailLogger.markEmailSent(trackingId, result.messageId);
      } else {
        // Mark as failed in logs
        this.emailLogger.markEmailFailed(trackingId, result.error || 'Unknown error');
        throw new Error(result.error || 'Failed to send email');
      }

      return trackingId;

    } catch (error) {
      // Mark as failed in logs
      this.emailLogger.markEmailFailed(trackingId, error as Error);
      throw error;
    }
  }

  /**
   * Send basic email (without template)
   */
  public async sendEmail(options: EmailOptions): Promise<string> {
    // Create tracking log
    const trackingId = this.emailLogger.createEmailLog(
      options.to, 
      options.subject, 
      undefined,
      options.trackingId
    );

    // Update email options with tracking ID
    options.trackingId = trackingId;

    try {
      // Send email
      const result = await this.emailSender.sendEmail(options);

      if (result.success) {
        // Mark as sent in logs
        this.emailLogger.markEmailSent(trackingId, result.messageId);
      } else {
        // Mark as failed in logs
        this.emailLogger.markEmailFailed(trackingId, result.error || 'Unknown error');
        throw new Error(result.error || 'Failed to send email');
      }

      return trackingId;

    } catch (error) {
      // Mark as failed in logs
      this.emailLogger.markEmailFailed(trackingId, error as Error);
      throw error;
    }
  }

  // === Template Management Methods ===

  /**
   * Get available templates
   */
  public getAvailableTemplates(): EmailTemplate[] {
    return this.templateManager.getAvailableTemplates();
  }

  /**
   * Add custom template
   */
  public addTemplate(template: EmailTemplate): void {
    this.templateManager.addTemplate(template);
  }

  // === Email Tracking and Logging Methods ===

  /**
   * Get email status by tracking ID
   */
  public getEmailStatus(trackingId: string): EmailLog | null {
    return this.emailLogger.getEmailStatus(trackingId);
  }

  /**
   * Get email statistics
   */
  public getEmailStats(): EmailStats {
    return this.emailLogger.getEmailStats();
  }

  /**
   * Get email statistics for a specific period
   */
  public getEmailStatsForPeriod(startDate: Date, endDate: Date): EmailStats {
    return this.emailLogger.getEmailStatsForPeriod(startDate, endDate);
  }

  /**
   * Get all email logs
   */
  public getAllEmailLogs(): EmailLog[] {
    return this.emailLogger.getAllEmailLogs();
  }

  /**
   * Get email logs by status
   */
  public getEmailLogsByStatus(status: EmailLog['status']): EmailLog[] {
    return this.emailLogger.getEmailLogsByStatus(status);
  }

  /**
   * Get email logs by template
   */
  public getEmailLogsByTemplate(templateName: string): EmailLog[] {
    return this.emailLogger.getEmailLogsByTemplate(templateName);
  }

  /**
   * Clear old email logs
   */
  public clearOldLogs(daysToKeep: number = 30): number {
    return this.emailLogger.clearOldLogs(daysToKeep);
  }

  // === Configuration and Validation Methods ===

  /**
   * Validate email configuration
   */
  public validateConfiguration(): EmailConfigValidation {
    return this.emailSender.validateConfiguration();
  }

  /**
   * Test email configuration
   */
  public async testConfiguration(testEmail: string): Promise<boolean> {
    return this.emailSender.testConfiguration(testEmail);
  }

  /**
   * Check if email service is configured
   */
  public isConfigured(): boolean {
    return this.emailSender.isEmailServiceConfigured();
  }

  // === Webhook Handlers for Provider Events ===

  /**
   * Handle email delivery webhook
   */
  public handleEmailDelivered(trackingId: string): void {
    this.emailLogger.markEmailDelivered(trackingId);
  }

  /**
   * Handle email bounce webhook
   */
  public handleEmailBounced(trackingId: string, reason?: string): void {
    this.emailLogger.markEmailBounced(trackingId, reason);
  }
}