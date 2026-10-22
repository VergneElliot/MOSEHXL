import { afterEach, describe, expect, it } from 'vitest';
import {
  createDigitalSignature,
  generateFileHash,
  resolveArchiveRegisterId,
  verifyDigitalSignature,
} from './archiveCrypto';

describe('archiveCrypto', () => {
  const previousKey = process.env.ARCHIVE_SECRET_KEY;

  afterEach(() => {
    if (previousKey === undefined) {
      delete process.env.ARCHIVE_SECRET_KEY;
    } else {
      process.env.ARCHIVE_SECRET_KEY = previousKey;
    }
  });

  it('resolveArchiveRegisterId prefixes establishment id', () => {
    expect(resolveArchiveRegisterId('est-abc')).toBe('CR-est-abc');
    expect(resolveArchiveRegisterId()).toBe('CR-UNKNOWN');
  });

  it('generateFileHash is stable sha256 hex', () => {
    const a = generateFileHash('hello');
    const b = generateFileHash(Buffer.from('hello'));
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('createDigitalSignature requires a long secret', () => {
    delete process.env.ARCHIVE_SECRET_KEY;
    expect(() => createDigitalSignature('payload')).toThrow(/ARCHIVE_SECRET_KEY/);
  });

  it('signs and verifies with timing-safe compare', () => {
    process.env.ARCHIVE_SECRET_KEY = 'k'.repeat(32);
    const sig = createDigitalSignature('payload');
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyDigitalSignature('payload', sig)).toBe(true);
    expect(verifyDigitalSignature('other', sig)).toBe(false);
  });
});
