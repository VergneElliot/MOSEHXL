import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../middleware/errorHandler';
import {
  assertPinPointageOnVenueNetwork,
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

  it('allows a listed client IP', async () => {
    getNetwork.mockResolvedValue({ allowed_ips: ['203.0.113.10'] });
    await expect(
      assertPinPointageOnVenueNetwork('est-1', '203.0.113.10')
    ).resolves.toBeUndefined();
  });

  it('rejects off-network and empty allowlist', async () => {
    getNetwork.mockResolvedValue({ allowed_ips: ['203.0.113.10'] });
    await expect(
      assertPinPointageOnVenueNetwork('est-1', '198.51.100.1')
    ).rejects.toMatchObject({
      errorCode: 'PIN_POINTAGE_OFF_VENUE_NETWORK',
      statusCode: 403,
    });

    getNetwork.mockResolvedValue({ allowed_ips: [] });
    await expect(assertPinPointageOnVenueNetwork('est-1', '203.0.113.10')).rejects.toBeInstanceOf(
      AppError
    );
  });
});
