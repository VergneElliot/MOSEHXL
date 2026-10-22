import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmailSender } from './EmailSender';

function logger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe('EmailSender', () => {
  const prevKey = process.env.SENDGRID_API_KEY;
  const prevFrom = process.env.FROM_EMAIL;
  const prevEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (prevKey === undefined) delete process.env.SENDGRID_API_KEY;
    else process.env.SENDGRID_API_KEY = prevKey;
    if (prevFrom === undefined) delete process.env.FROM_EMAIL;
    else process.env.FROM_EMAIL = prevFrom;
    process.env.NODE_ENV = prevEnv;
  });

  it('runs in development mode without API key and fakes send', async () => {
    delete process.env.SENDGRID_API_KEY;
    process.env.NODE_ENV = 'test';
    const sender = new EmailSender({} as never, logger() as never);
    expect(sender.isEmailServiceConfigured()).toBe(false);
    const result = await sender.sendEmail({
      to: 'a@b.com',
      subject: 'Hi',
      html: '<p>x</p>',
    });
    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^dev-mode-/);
  });

  it('refuses send in production when unconfigured', async () => {
    delete process.env.SENDGRID_API_KEY;
    process.env.NODE_ENV = 'production';
    const sender = new EmailSender({} as never, logger() as never);
    const result = await sender.sendEmail({
      to: 'a@b.com',
      subject: 'Hi',
      html: '<p>x</p>',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/SENDGRID_API_KEY/);
  });

  it('validateConfiguration / getDefaultSenderEmail / testConfiguration', async () => {
    delete process.env.SENDGRID_API_KEY;
    delete process.env.FROM_EMAIL;
    process.env.NODE_ENV = 'test';
    const sender = new EmailSender({} as never, logger() as never);
    expect(sender.validateConfiguration().isValid).toBe(false);
    expect(sender.validateConfiguration().issues.length).toBeGreaterThan(0);
    expect(sender.getDefaultSenderEmail()).toBe('noreply@mosehxl.com');
    await expect(sender.testConfiguration('t@example.com')).resolves.toBe(true);
  });
});
