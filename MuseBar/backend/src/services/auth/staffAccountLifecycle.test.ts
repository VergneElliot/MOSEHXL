import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  getIncludingInactive: vi.fn(),
  upsert: vi.fn(),
  remove: vi.fn(),
  clearPin: vi.fn(),
  closeAllForUser: vi.fn(),
  revokeAllForUser: vi.fn(),
  deleteUserById: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  pool: { query: mocks.poolQuery },
}));

vi.mock('../../models/membership', () => ({
  MembershipModel: {
    getIncludingInactive: mocks.getIncludingInactive,
    upsert: mocks.upsert,
    remove: mocks.remove,
  },
}));

vi.mock('../../models/membershipPin', () => ({
  MembershipPinModel: { clearPin: mocks.clearPin },
}));

vi.mock('../../models/refreshToken', () => ({
  RefreshTokenModel: { revokeAllForUser: mocks.revokeAllForUser },
}));

vi.mock('../../models/staffPinSession', () => ({
  StaffPinSessionModel: { closeAllForUser: mocks.closeAllForUser },
}));

vi.mock('../../models/user', () => ({
  UserModel: { deleteUserById: mocks.deleteUserById },
}));

import {
  deactivateStaffAccount,
  describeAccountFootprint,
  purgeStaffAccount,
  reactivateStaffAccount,
} from './staffAccountLifecycle';

describe('staffAccountLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upsert.mockResolvedValue(undefined);
    mocks.clearPin.mockResolvedValue(true);
    mocks.closeAllForUser.mockResolvedValue(2);
    mocks.revokeAllForUser.mockResolvedValue(undefined);
    mocks.remove.mockResolvedValue(undefined);
    mocks.deleteUserById.mockResolvedValue(undefined);
  });

  it('describeAccountFootprint marks purgeable only when all zero', async () => {
    mocks.poolQuery.mockResolvedValue({
      rows: [{ orders: 0, journal_entries: 0, audit_entries: 0, time_entries: 0 }],
    });
    await expect(describeAccountFootprint(1, 'est-1')).resolves.toMatchObject({
      purgeable: true,
      orders: 0,
    });

    mocks.poolQuery.mockResolvedValue({
      rows: [{ orders: 1, journal_entries: 0, audit_entries: 0, time_entries: 0 }],
    });
    await expect(describeAccountFootprint(1, 'est-1')).resolves.toMatchObject({
      purgeable: false,
      orders: 1,
    });
  });

  it('deactivateStaffAccount clears PIN when present and closes sessions', async () => {
    mocks.getIncludingInactive.mockResolvedValue({
      role: 'staff',
      pin_hash: '$2b$hash',
    });
    const result = await deactivateStaffAccount(9, 'est-1');
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 9, is_active: false })
    );
    expect(mocks.clearPin).toHaveBeenCalledWith(9, 'est-1');
    expect(mocks.closeAllForUser).toHaveBeenCalledWith(9, 'est-1', 'account_deactivated');
    expect(result).toEqual({ deactivated: true, pin_cleared: true, sessions_closed: 2 });
  });

  it('deactivateStaffAccount skips PIN clear when none set', async () => {
    mocks.getIncludingInactive.mockResolvedValue({ role: 'staff', pin_hash: null });
    const result = await deactivateStaffAccount(9, 'est-1');
    expect(mocks.clearPin).not.toHaveBeenCalled();
    expect(result.pin_cleared).toBe(false);
  });

  it('reactivateStaffAccount returns false when membership missing', async () => {
    mocks.getIncludingInactive.mockResolvedValue(null);
    await expect(reactivateStaffAccount(1, 'est-1')).resolves.toBe(false);
  });

  it('reactivateStaffAccount re-enables membership', async () => {
    mocks.getIncludingInactive.mockResolvedValue({ role: 'manager' });
    await expect(reactivateStaffAccount(1, 'est-1')).resolves.toBe(true);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'manager', is_active: true })
    );
  });

  it('purgeStaffAccount refuses non-purgeable footprint', async () => {
    mocks.poolQuery.mockResolvedValue({
      rows: [{ orders: 2, journal_entries: 0, audit_entries: 0, time_entries: 0 }],
    });
    const result = await purgeStaffAccount(1, 'est-1');
    expect(result.purged).toBe(false);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('purgeStaffAccount deletes user when no remaining memberships', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({
        rows: [{ orders: 0, journal_entries: 0, audit_entries: 0, time_entries: 0 }],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const result = await purgeStaffAccount(4, 'est-1');
    expect(result.purged).toBe(true);
    expect(mocks.remove).toHaveBeenCalledWith(4, 'est-1');
    expect(mocks.deleteUserById).toHaveBeenCalledWith(4);
  });
});
