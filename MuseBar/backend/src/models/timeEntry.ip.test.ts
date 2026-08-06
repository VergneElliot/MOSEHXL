import { describe, expect, it } from 'vitest';
import {
  isIpAllowed,
  isValidIpOrCidr,
  normalizeAllowedIps,
} from '../../models/timeEntry';

describe('time clock IP allowlist', () => {
  it('validates bare IPv4 and CIDR', () => {
    expect(isValidIpOrCidr('203.0.113.10')).toBe(true);
    expect(isValidIpOrCidr('203.0.113.0/24')).toBe(true);
    expect(isValidIpOrCidr('203.0.113.0/33')).toBe(false);
    expect(isValidIpOrCidr('not-an-ip')).toBe(false);
  });

  it('matches exact IP and strips IPv4-mapped prefix', () => {
    expect(isIpAllowed('203.0.113.10', ['203.0.113.10'])).toBe(true);
    expect(isIpAllowed('::ffff:203.0.113.10', ['203.0.113.10'])).toBe(true);
    expect(isIpAllowed('203.0.113.11', ['203.0.113.10'])).toBe(false);
  });

  it('matches IPv4 CIDR ranges', () => {
    expect(isIpAllowed('203.0.113.42', ['203.0.113.0/24'])).toBe(true);
    expect(isIpAllowed('203.0.114.1', ['203.0.113.0/24'])).toBe(false);
  });

  it('rejects when allowlist empty', () => {
    expect(isIpAllowed('203.0.113.10', [])).toBe(false);
  });

  it('normalizes allowlist arrays', () => {
    expect(normalizeAllowedIps([' 203.0.113.1 ', 'bad', '203.0.113.1', 12])).toEqual([
      '203.0.113.1',
    ]);
  });
});
