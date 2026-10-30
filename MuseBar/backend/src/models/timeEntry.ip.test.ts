import { describe, expect, it } from 'vitest';
import {
  isIpAllowed,
  isValidIpOrCidr,
  ipv6HostToPrefixCidr,
  normalizeAllowedIps,
} from './timeEntry';

describe('time clock IP allowlist', () => {
  it('validates bare IPv4 and CIDR', () => {
    expect(isValidIpOrCidr('203.0.113.10')).toBe(true);
    expect(isValidIpOrCidr('203.0.113.0/24')).toBe(true);
    expect(isValidIpOrCidr('203.0.113.0/33')).toBe(false);
    expect(isValidIpOrCidr('not-an-ip')).toBe(false);
  });

  it('validates IPv6 hosts and /64 prefixes', () => {
    expect(isValidIpOrCidr('2a02:8424:5fc6:3e01:a865:c81f:3b13:1c4b')).toBe(true);
    expect(isValidIpOrCidr('2a02:8424:5fc6:3e01::/64')).toBe(true);
    expect(isValidIpOrCidr('2a02:8424:5fc6:3e01::/129')).toBe(false);
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

  it('matches IPv6 /64 so privacy addresses on the same LAN work', () => {
    const prefix = '2a02:8424:5fc6:3e01::/64';
    expect(
      isIpAllowed('2a02:8424:5fc6:3e01:a865:c81f:3b13:1c4b', [prefix])
    ).toBe(true);
    expect(
      isIpAllowed('2a02:8424:5fc6:3e01:c3bc:393f:2cd2:cddd', [prefix])
    ).toBe(true);
    expect(
      isIpAllowed('2a02:8424:5fc6:3e02:c3bc:393f:2cd2:cddd', [prefix])
    ).toBe(false);
  });

  it('builds a /64 prefix from an IPv6 host', () => {
    expect(ipv6HostToPrefixCidr('2a02:8424:5fc6:3e01:a865:c81f:3b13:1c4b')).toBe(
      '2a02:8424:5fc6:3e01:0:0:0:0/64'
    );
    expect(ipv6HostToPrefixCidr('203.0.113.10')).toBeNull();
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
