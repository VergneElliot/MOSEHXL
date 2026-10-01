import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isPinPointageOnVenueNetwork,
  normalizeClientIp,
} from './venueNetworkGuard';

const getNetwork = vi.fn();

vi.mock('../../models/timeEntry', () => ({
  TimeClockNetworkSettingsModel: {
    get: (...args: unknown[]) => getNetwork(...args),
  },
  isIpAllowed: (ip: string | null, allowlist: string[]) => {
    if (!ip || allowlist.length === 0) return false;
    return allowlist.includes(ip);
  },
}));

describe('venueNetworkGuard', () => {
  beforeEach(() => {
    getNetwork.mockReset();
  });

  it('normalizes IPv4-mapped addresses', () => {
    expect(normalizeClientIp('::ffff:203.0.113.10')).toBe('203.0.113.10');
  });

  it('returns true for a listed client IP', async () => {
    getNetwork.mockResolvedValue({ allowed_ips: ['203.0.113.10'] });
    await expect(isPinPointageOnVenueNetwork('est-1', '203.0.113.10')).resolves.toBe(true);
  });

  it('returns false off-network and for empty allowlist', async () => {
    getNetwork.mockResolvedValue({ allowed_ips: ['203.0.113.10'] });
    await expect(isPinPointageOnVenueNetwork('est-1', '198.51.100.1')).resolves.toBe(false);

    getNetwork.mockResolvedValue({ allowed_ips: [] });
    await expect(isPinPointageOnVenueNetwork('est-1', '203.0.113.10')).resolves.toBe(false);
  });
});
