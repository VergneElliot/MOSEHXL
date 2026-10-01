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
  isPinPointageOnVenueNetwork: vi.fn(),
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
  isPinPointageOnVenueNetwork: mocks.isPinPointageOnVenueNetwork,
}));

vi.mock('../../utils/logger', () => ({
  Logger: { getInstance: () => ({ error: mocks.error }) },
}));

vi.mock('./pinActorToken', () => ({
  PIN_ACTOR_TTL_MS: 86_400_000,
}));

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
    mocks.isPinPointageOnVenueNetwork.mockResolvedValue(true);
  });

  it('reuses on venue and clocks in if needed (home→venue unlock)', async () => {
    mocks.findActiveForUser.mockResolvedValue({ id: 'sid-existing', user_id: 42 });

    const id = await openPinSession(BASE);

    expect(id).toBe('sid-existing');
    expect(mocks.isPinPointageOnVenueNetwork).toHaveBeenCalledWith('est-1', '127.0.0.1');
    expect(mocks.touchAndExtend).toHaveBeenCalledWith(
      'sid-existing',
      'est-1',
      expect.any(Date)
    );
    expect(mocks.closeDuplicatesForUser).toHaveBeenCalledWith(42, 'est-1', 'sid-existing');
    expect(mocks.open).not.toHaveBeenCalled();
    expect(mocks.clockInOnPinOpen).toHaveBeenCalledWith({
      establishmentId: 'est-1',
      userId: 42,
      ip: '127.0.0.1',
    });
  });

  it('reuses off venue without clock-in', async () => {
    mocks.findActiveForUser.mockResolvedValue({ id: 'sid-existing', user_id: 42 });
    mocks.isPinPointageOnVenueNetwork.mockResolvedValue(false);

    const id = await openPinSession(BASE);

    expect(id).toBe('sid-existing');
    expect(mocks.open).not.toHaveBeenCalled();
    expect(mocks.clockInOnPinOpen).not.toHaveBeenCalled();
  });

  it('inserts and clocks in when on venue and no open session', async () => {
    mocks.findActiveForUser.mockResolvedValue(null);
    mocks.open.mockResolvedValue({ id: 'sid-new' });

    const id = await openPinSession(BASE);

    expect(id).toBe('sid-new');
    expect(mocks.isPinPointageOnVenueNetwork).toHaveBeenCalledWith('est-1', '127.0.0.1');
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

  it('inserts without clock-in when off venue', async () => {
    mocks.findActiveForUser.mockResolvedValue(null);
    mocks.open.mockResolvedValue({ id: 'sid-home' });
    mocks.isPinPointageOnVenueNetwork.mockResolvedValue(false);

    const id = await openPinSession(BASE);

    expect(id).toBe('sid-home');
    expect(mocks.open).toHaveBeenCalled();
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
    mocks.isPinPointageOnVenueNetwork.mockReset();
    mocks.clockOutOnPinClose.mockResolvedValue(undefined);
    mocks.close.mockResolvedValue(true);
    mocks.isPinPointageOnVenueNetwork.mockResolvedValue(true);
  });

  it('clocks out on venue then closes the row', async () => {
    await expect(
      closePinSession('sid-1', 'est-1', 'closed_by_user', {
        pinUserId: 42,
        ipAddress: '127.0.0.1',
      })
    ).resolves.toBe(true);

    expect(mocks.isPinPointageOnVenueNetwork).toHaveBeenCalledWith('est-1', '127.0.0.1');
    expect(mocks.clockOutOnPinClose).toHaveBeenCalledWith({
      establishmentId: 'est-1',
      userId: 42,
      ip: '127.0.0.1',
      recordPointage: true,
    });
    expect(mocks.close).toHaveBeenCalledWith('sid-1', 'est-1', 'closed_by_user');
  });

  it('closes off venue without recording clock-out', async () => {
    mocks.isPinPointageOnVenueNetwork.mockResolvedValue(false);

    await expect(
      closePinSession('sid-1', 'est-1', 'closed_by_user', {
        pinUserId: 42,
        ipAddress: '198.51.100.1',
      })
    ).resolves.toBe(true);

    expect(mocks.clockOutOnPinClose).toHaveBeenCalledWith({
      establishmentId: 'est-1',
      userId: 42,
      ip: '198.51.100.1',
      recordPointage: false,
    });
    expect(mocks.close).toHaveBeenCalledWith('sid-1', 'est-1', 'closed_by_user');
  });
});
