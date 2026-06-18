import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'crypto';
import { validatePasswordWithBreachCheck } from './passwordValidation';

describe('validatePasswordWithBreachCheck', () => {
  const originalEnabled = process.env.PASSWORD_BREACH_CHECK_ENABLED;
  const originalTimeout = process.env.PASSWORD_BREACH_CHECK_TIMEOUT_MS;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.env.PASSWORD_BREACH_CHECK_ENABLED = 'true';
    process.env.PASSWORD_BREACH_CHECK_TIMEOUT_MS = '2000';
  });

  afterEach(() => {
    process.env.PASSWORD_BREACH_CHECK_ENABLED = originalEnabled;
    process.env.PASSWORD_BREACH_CHECK_TIMEOUT_MS = originalTimeout;
  });

  it('rejects password when suffix is present in HIBP range response', async () => {
    const hashHex = crypto.createHash('sha1').update('Password1').digest('hex').toUpperCase();
    const suffix = hashHex.slice(5);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `${suffix}:100\n`,
    }));

    const result = await validatePasswordWithBreachCheck('Password1');

    expect(result.isValid).toBe(false);
    expect(String(result.error)).toContain('known data breaches');
  });

  it('accepts password when not present in HIBP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1\n',
    }));

    const result = await validatePasswordWithBreachCheck('StrongPass1');

    expect(result.isValid).toBe(true);
  });

  it('fails open when HIBP request errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unavailable')));

    const result = await validatePasswordWithBreachCheck('StrongPass1');

    expect(result.isValid).toBe(true);
  });
});
