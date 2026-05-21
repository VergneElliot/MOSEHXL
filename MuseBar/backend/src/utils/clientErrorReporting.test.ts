import { describe, expect, it } from 'vitest';
import {
  getClientErrorPayloadSizeBytes,
  isClientErrorPayloadTooLarge,
  MAX_CLIENT_ERROR_REPORT_BYTES,
  sanitizeClientErrorForLog,
  verifyClientErrorReportKey
} from './clientErrorReporting';

describe('client error reporting utilities', () => {
  it('flags payload as too large when over max bytes', () => {
    const oversized = {
      message: 'x'.repeat(MAX_CLIENT_ERROR_REPORT_BYTES + 200),
    };
    expect(getClientErrorPayloadSizeBytes(oversized)).toBeGreaterThan(MAX_CLIENT_ERROR_REPORT_BYTES);
    expect(isClientErrorPayloadTooLarge(oversized)).toBe(true);
  });

  it('does not flag payload as too large under max bytes', () => {
    const payload = {
      errorId: 'err-1',
      message: 'Minor client error',
    };
    expect(isClientErrorPayloadTooLarge(payload)).toBe(false);
  });

  it('sanitizes nested sensitive fields from client payload', () => {
    const sanitized = sanitizeClientErrorForLog({
      errorId: 'client-err-42',
      message: 'Oops',
      context: {
        token: 'abc123',
        nested: {
          password: 'hunter2',
          keep: 'value',
        },
      },
      tags: {
        setup_secret: 'secret-value',
        feature: 'checkout',
      },
    });

    expect(sanitized.errorId).toBe('client-err-42');
    expect(sanitized.message).toBe('Oops');
    expect((sanitized.context as Record<string, unknown>).token).toBe('[REDACTED]');
    expect(((sanitized.context as Record<string, unknown>).nested as Record<string, unknown>).password).toBe('[REDACTED]');
    expect(((sanitized.context as Record<string, unknown>).nested as Record<string, unknown>).keep).toBe('value');
    expect((sanitized.tags as Record<string, unknown>).setup_secret).toBe('[REDACTED]');
    expect((sanitized.tags as Record<string, unknown>).feature).toBe('checkout');
  });

  it('verifies matching client error report key', () => {
    expect(verifyClientErrorReportKey('very-long-shared-key-123', 'very-long-shared-key-123')).toBe(true);
  });

  it('rejects non-matching or malformed client error report keys', () => {
    expect(verifyClientErrorReportKey('very-long-shared-key-123', 'very-long-shared-key-999')).toBe(false);
    expect(verifyClientErrorReportKey('short', 'very-long-shared-key-123')).toBe(false);
    expect(verifyClientErrorReportKey('', 'very-long-shared-key-123')).toBe(false);
    expect(verifyClientErrorReportKey('very-long-shared-key-123', '')).toBe(false);
  });
});
