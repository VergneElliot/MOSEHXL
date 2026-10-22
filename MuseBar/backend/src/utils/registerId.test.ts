import { describe, expect, it } from 'vitest';
import { getRegisterIdForEstablishment } from './registerId';

describe('getRegisterIdForEstablishment', () => {
  it('returns CR-<id> for a non-empty establishment id', () => {
    expect(getRegisterIdForEstablishment('est-abc')).toBe('CR-est-abc');
    expect(getRegisterIdForEstablishment('  est-abc  ')).toBe('CR-est-abc');
  });

  it('falls back when missing or blank', () => {
    expect(getRegisterIdForEstablishment(undefined)).toBe('CR-UNKNOWN');
    expect(getRegisterIdForEstablishment(null)).toBe('CR-UNKNOWN');
    expect(getRegisterIdForEstablishment('')).toBe('CR-UNKNOWN');
    expect(getRegisterIdForEstablishment('   ')).toBe('CR-UNKNOWN');
    expect(getRegisterIdForEstablishment(12 as unknown as string)).toBe('CR-UNKNOWN');
  });
});
