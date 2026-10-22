import { describe, expect, it, vi } from 'vitest';
import { EmailLogger } from './EmailLogger';

function logger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe('EmailLogger', () => {
  it('tracks lifecycle and stats', () => {
    const log = logger();
    const emailLogger = new EmailLogger(log as never);
    const id = emailLogger.createEmailLog(['a@b.com', 'c@d.com'], 'Hello', 'welcome', 'fixed-id');
    expect(id).toBe('fixed-id');
    expect(emailLogger.getEmailStatus(id)?.status).toBe('pending');

    emailLogger.markEmailSent(id, 'msg-1');
    expect(emailLogger.getEmailStatus(id)?.status).toBe('sent');
    expect(emailLogger.getEmailStatus(id)?.providerMessageId).toBe('msg-1');

    const id2 = emailLogger.createEmailLog('x@y.com', 'Fail', 'alert');
    emailLogger.markEmailFailed(id2, new Error('smtp'));
    emailLogger.markEmailDelivered(id);
    emailLogger.markEmailBounced(id2, 'mailbox full');

    expect(emailLogger.getEmailLogsByStatus('delivered')).toHaveLength(1);
    expect(emailLogger.getEmailLogsByTemplate('welcome')).toHaveLength(1);
    expect(emailLogger.getAllEmailLogs().length).toBe(2);

    const stats = emailLogger.getEmailStats();
    expect(stats.totalEmails).toBe(2);
    expect(stats.failedEmails + stats.sentEmails + stats.pendingEmails).toBeLessThanOrEqual(2);

    const period = emailLogger.getEmailStatsForPeriod(
      new Date(Date.now() - 60_000),
      new Date(Date.now() + 60_000)
    );
    expect(period.totalEmails).toBe(2);
  });

  it('clearOldLogs removes aged entries', () => {
    const emailLogger = new EmailLogger(logger() as never);
    const id = emailLogger.createEmailLog('a@b.com', 'Old');
    const entry = emailLogger.getEmailStatus(id)!;
    entry.createdAt = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    expect(emailLogger.clearOldLogs(30)).toBe(1);
    expect(emailLogger.getEmailStatus(id)).toBeNull();
  });
});
