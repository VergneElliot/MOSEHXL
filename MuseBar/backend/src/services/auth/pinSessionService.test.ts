import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  closeStale: vi.fn(),
  findActiveForUser: vi.fn(),
  touchAndExtend: vi.fn(),
  closeDuplicatesForUser: vi.fn(),
  open: vi.fn(),
  close: vi.fn(),
  clockInOnPinOpen: vi.fn(),
  clockOutOnPinClose: vi.fn(),
  assertPinPointageOnVenueNetwork: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../models/staffPinSession', () => ({
  StaffPinSessionModel: {
    closeStale: mocks.closeStale,
    findActiveForUser: mocks.findActiveForUser,
    touchAndExtend: mocks.touchAndExtend,
    closeDuplicatesForUser: mocks.closeDuplicatesForUser,
    open: mocks.open,
    close: mocks.close,
  },
}));

vi.mock('./pinSessionPointage', () => ({
  clockInOnPinOpen: mocks.clockInOnPinOpen,
  clockOutOnPinClose: mocks.clockOutOnPinClose,
}));

vi.mock('./venueNetworkGuard', () => ({
  assertPinPointageOnVenueNetwork: mocks.assertPinPointageOnVenueNetwork,
}));

vi.mock('../../utils/logger', () => ({
  Logger: { getInstance: () => ({ error: mocks.error }) },
}));

vi.mock('./pinActorToken', () => ({
  PIN_ACTOR_TTL_MS: 86_400_000,
}));

import { AppError } from '../../middleware/errorHandler';
import { closePinSession, openPinSession } from './pinSessionService';

const BASE = {
  establishmentId: 'est-1',
  pinUserId: 42,
  openedByUserId: 7,
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
};

describe('openPinSession', () => {
  beforeEach(() => {
    for (const fn of Object.values(mocks)) fn.mockReset();
    mocks.closeStale.mockResolvedValue(0);
    mocks.touchAndExtend.mockResolvedValue(true);
    mocks.closeDuplicatesForUser.mockResolvedValue(0);
    mocks.clockInOnPinOpen.mockResolvedValue(undefined);
    mocks.assertPinPointageOnVenueNetwork.mockResolvedValue(undefined);
  });

  it('reuses an open session and does not clock in again', async () => {
    mocks.findActiveForUser.mockResolvedValue({ id: 'sid-existing', user_id: 42 });

    const id = await openPinSession(BASE);

    expect(id).toBe('sid-existing');
    expect(mocks.assertPinPointageOnVenueNetwork).not.toHaveBeenCalled();
    expect(mocks.touchAndExtend).toHaveBeenCalledWith(
      'sid-existing',
      'est-1',
      expect.any(Date)
    );
    expect(mocks.closeDuplicatesForUser).toHaveBeenCalledWith(42, 'est-1', 'sid-existing');
    expect(mocks.open).not.toHaveBeenCalled();
    expect(mocks.clockInOnPinOpen).not.toHaveBeenCalled();
  });

  it('inserts and clocks in when no open session exists', async () => {
    mocks.findActiveForUser.mockResolvedValue(null);
    mocks.open.mockResolvedValue({ id: 'sid-new' });

    const id = await openPinSession(BASE);

    expect(id).toBe('sid-new');
    expect(mocks.assertPinPointageOnVenueNetwork).toHaveBeenCalledWith('est-1', '127.0.0.1');
    expect(mocks.open).toHaveBeenCalledWith(
      expect.objectContaining({
        establishmentId: 'est-1',
        userId: 42,
        openedByUserId: 7,
      })
    );
    expect(mocks.clockInOnPinOpen).toHaveBeenCalledWith({
      establishmentId: 'est-1',
      userId: 42,
      ip: '127.0.0.1',
    });
    expect(mocks.touchAndExtend).not.toHaveBeenCalled();
  });

  it('propagates venue-network denial on first open', async () => {
    mocks.findActiveForUser.mockResolvedValue(null);
    mocks.assertPinPointageOnVenueNetwork.mockRejectedValue(
      new AppError('off network', 403, 'PIN_POINTAGE_OFF_VENUE_NETWORK')
    );

    await expect(openPinSession(BASE)).rejects.toMatchObject({
      errorCode: 'PIN_POINTAGE_OFF_VENUE_NETWORK',
    });
    expect(mocks.open).not.toHaveBeenCalled();
    expect(mocks.clockInOnPinOpen).not.toHaveBeenCalled();
  });

  it('returns null without throwing when persistence fails', async () => {
    mocks.findActiveForUser.mockRejectedValue(new Error('db down'));

    await expect(openPinSession(BASE)).resolves.toBeNull();
    expect(mocks.error).toHaveBeenCalled();
  });
});

describe('closePinSession', () => {
  beforeEach(() => {
    mocks.clockOutOnPinClose.mockReset();
    mocks.close.mockReset();
    mocks.assertPinPointageOnVenueNetwork.mockReset();
    mocks.clockOutOnPinClose.mockResolvedValue(undefined);
    mocks.close.mockResolvedValue(true);
    mocks.assertPinPointageOnVenueNetwork.mockResolvedValue(undefined);
  });

  it('clocks out then closes the row after network check', async () => {
    await expect(
      closePinSession('sid-1', 'est-1', 'closed_by_user', {
        pinUserId: 42,
        ipAddress: '127.0.0.1',
      })
    ).resolves.toBe(true);

    expect(mocks.assertPinPointageOnVenueNetwork).toHaveBeenCalledWith('est-1', '127.0.0.1');
    expect(mocks.clockOutOnPinClose).toHaveBeenCalledWith({
      establishmentId: 'est-1',
      userId: 42,
      ip: '127.0.0.1',
    });
    expect(mocks.close).toHaveBeenCalledWith('sid-1', 'est-1', 'closed_by_user');
  });

  it('refuses close off venue network', async () => {
    mocks.assertPinPointageOnVenueNetwork.mockRejectedValue(
      new AppError('off network', 403, 'PIN_POINTAGE_OFF_VENUE_NETWORK')
    );

    await expect(
      closePinSession('sid-1', 'est-1', 'closed_by_user', {
        pinUserId: 42,
        ipAddress: '198.51.100.1',
      })
    ).rejects.toMatchObject({ errorCode: 'PIN_POINTAGE_OFF_VENUE_NETWORK' });
    expect(mocks.close).not.toHaveBeenCalled();
  });
});
