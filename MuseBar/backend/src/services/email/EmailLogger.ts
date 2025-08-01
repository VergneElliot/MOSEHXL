/**
 * Email Logger
 * Handles email logging, tracking, and statistics
 */

import { randomUUID } from 'crypto';
import { Logger } from '../../utils/logger';

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
 * Email statistics interface
 */
export interface EmailStats {
  totalEmails: number;
  sentEmails: number;
  failedEmails: number;
  pendingEmails: number;
}

/**
 * Email Logger Class
 */
export class EmailLogger {
  private logger: Logger;
  private emailLogs: Map<string, EmailLog> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Create new email log entry
   */
  public createEmailLog(
    recipients: string | string[], 
    subject: string, 
    templateName?: string,
    trackingId?: string
  ): string {
    const id = trackingId || randomUUID();
    const recipientEmails = Array.isArray(recipients) ? recipients : [recipients];

    const emailLog: EmailLog = {
      id,
      recipientEmail: recipientEmails.join(', '),
      templateName,
      subject,
      status: 'pending',
      createdAt: new Date(),
    };

    this.emailLogs.set(id, emailLog);

    this.logger.info(
      'Email log created',
      {
        trackingId: id,
        recipients: recipientEmails.length,
        subject,
        templateName
      },
      'EMAIL_LOGGER'
    );

    return id;
  }

  /**
   * Update email log status to sent
   */
  public markEmailSent(trackingId: string, providerMessageId?: string): void {
    const emailLog = this.emailLogs.get(trackingId);
    
    if (emailLog) {
      emailLog.status = 'sent';
      emailLog.sentAt = new Date();
      emailLog.providerMessageId = providerMessageId;

      this.logger.info(
        'Email marked as sent',
        {
          trackingId,
          subject: emailLog.subject,
          messageId: providerMessageId,
        },
        'EMAIL_LOGGER'
      );
    }
  }

  /**
   * Update email log status to failed
   */
  public markEmailFailed(trackingId: string, error: Error | string): void {
    const emailLog = this.emailLogs.get(trackingId);
    
    if (emailLog) {
      emailLog.status = 'failed';
      emailLog.errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        'Email marked as failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          trackingId,
          subject: emailLog.subject,
        },
        'EMAIL_LOGGER'
      );
    }
  }

  /**
   * Update email log status to delivered
   */
  public markEmailDelivered(trackingId: string): void {
    const emailLog = this.emailLogs.get(trackingId);
    
    if (emailLog) {
      emailLog.status = 'delivered';

      this.logger.info(
        'Email marked as delivered',
        { trackingId, subject: emailLog.subject },
        'EMAIL_LOGGER'
      );
    }
  }

  /**
   * Update email log status to bounced
   */
  public markEmailBounced(trackingId: string, reason?: string): void {
    const emailLog = this.emailLogs.get(trackingId);
    
    if (emailLog) {
      emailLog.status = 'bounced';
      emailLog.errorMessage = reason || 'Email bounced';

      this.logger.warn(
        'Email marked as bounced',
        { trackingId, subject: emailLog.subject, reason },
        'EMAIL_LOGGER'
      );
    }
  }

  /**
   * Get email status by tracking ID
   */
  public getEmailStatus(trackingId: string): EmailLog | null {
    return this.emailLogs.get(trackingId) || null;
  }

  /**
   * Get all email logs
   */
  public getAllEmailLogs(): EmailLog[] {
    return Array.from(this.emailLogs.values());
  }

  /**
   * Get email logs by status
   */
  public getEmailLogsByStatus(status: EmailLog['status']): EmailLog[] {
    return Array.from(this.emailLogs.values()).filter(log => log.status === status);
  }

  /**
   * Get email logs by template
   */
  public getEmailLogsByTemplate(templateName: string): EmailLog[] {
    return Array.from(this.emailLogs.values()).filter(log => log.templateName === templateName);
  }

  /**
   * Get email statistics
   */
  public getEmailStats(): EmailStats {
    const logs = Array.from(this.emailLogs.values());
    
    return {
      totalEmails: logs.length,
      sentEmails: logs.filter(log => log.status === 'sent').length,
      failedEmails: logs.filter(log => log.status === 'failed').length,
      pendingEmails: logs.filter(log => log.status === 'pending').length,
    };
  }

  /**
   * Get email statistics for a specific time period
   */
  public getEmailStatsForPeriod(startDate: Date, endDate: Date): EmailStats {
    const logs = Array.from(this.emailLogs.values()).filter(
      log => log.createdAt >= startDate && log.createdAt <= endDate
    );
    
    return {
      totalEmails: logs.length,
      sentEmails: logs.filter(log => log.status === 'sent').length,
      failedEmails: logs.filter(log => log.status === 'failed').length,
      pendingEmails: logs.filter(log => log.status === 'pending').length,
    };
  }

  /**
   * Clear old email logs (older than specified days)
   */
  public clearOldLogs(daysToKeep: number = 30): number {
    const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));
    let deletedCount = 0;

    for (const [id, log] of this.emailLogs.entries()) {
      if (log.createdAt < cutoffDate) {
        this.emailLogs.delete(id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.info(
        'Old email logs cleared',
        { deletedCount, daysToKeep },
        'EMAIL_LOGGER'
      );
    }

    return deletedCount;
  }
}