import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '@mosehxl/types';

const mocks = vi.hoisted(() => ({
  getUserPermissions: vi.fn(),
  setUserPermissions: vi.fn(),
  getMembershipWithPin: vi.fn(),
  clearPin: vi.fn(),
  closeAllForUser: vi.fn(),
}));

vi.mock('../../models/user', () => ({
  UserModel: {
    getUserPermissions: mocks.getUserPermissions,
    setUserPermissions: mocks.setUserPermissions,
  },
}));

vi.mock('../../models/membershipPin', () => ({
  MembershipPinModel: {
    getMembershipWithPin: mocks.getMembershipWithPin,
    clearPin: mocks.clearPin,
  },
}));

vi.mock('../../models/staffPinSession', () => ({
  StaffPinSessionModel: {
    closeAllForUser: mocks.closeAllForUser,
  },
}));

import { applyPermissionGrants } from './permissionGrantService';

describe('applyPermissionGrants', () => {
  beforeEach(() => {
    mocks.getUserPermissions.mockReset();
    mocks.setUserPermissions.mockReset();
    mocks.getMembershipWithPin.mockReset();
    mocks.clearPin.mockReset();
    mocks.closeAllForUser.mockReset();

    mocks.setUserPermissions.mockResolvedValue(undefined);
    mocks.clearPin.mockResolvedValue(true);
    mocks.closeAllForUser.mockResolvedValue(0);
    mocks.getMembershipWithPin.mockResolvedValue({
      role: 'staff',
      pin_hash: '$2b$12$hash',
    });
  });

  it('stores specific grants only, dropping basic and unknown keys', async () => {
    mocks.getUserPermissions
      .mockResolvedValueOnce([PERMISSIONS.access_pos])
      .mockResolvedValueOnce([PERMISSIONS.access_pos, PERMISSIONS.access_documents]);

    const result = await applyPermissionGrants({
      targetUserId: 9,
      establishmentId: 'est-1',
      requested: [PERMISSIONS.access_pos, PERMISSIONS.access_documents, 'access_history'],
    });

    expect(mocks.setUserPermissions).toHaveBeenCalledWith(
      9,
      [PERMISSIONS.access_documents],
      'est-1'
    );
    expect(result.granted).toEqual([PERMISSIONS.access_documents]);
  });

  it('deduplicates repeated grants', async () => {
    mocks.getUserPermissions.mockResolvedValue([PERMISSIONS.access_pos]);

    await applyPermissionGrants({
      targetUserId: 9,
      establishmentId: 'est-1',
      requested: [PERMISSIONS.orders_cancel, PERMISSIONS.orders_cancel],
    });

    expect(mocks.setUserPermissions).toHaveBeenCalledWith(
      9,
      [PERMISSIONS.orders_cancel],
      'est-1'
    );
  });

  it('clears a 2-digit PIN when the account gains its first specific permission', async () => {
    mocks.getUserPermissions
      .mockResolvedValueOnce([PERMISSIONS.access_pos])
      .mockResolvedValueOnce([PERMISSIONS.access_pos, PERMISSIONS.access_closure]);

    const result = await applyPermissionGrants({
      targetUserId: 9,
      establishmentId: 'est-1',
      requested: [PERMISSIONS.access_closure],
    });

    expect(mocks.clearPin).toHaveBeenCalledWith(9, 'est-1');
    expect(result.pin_cleared).toBe(true);
  });

  it('keeps the PIN when the account already needed an elevated one', async () => {
    mocks.getUserPermissions
      .mockResolvedValueOnce([PERMISSIONS.access_pos, PERMISSIONS.access_closure])
      .mockResolvedValueOnce([PERMISSIONS.access_pos, PERMISSIONS.access_planning]);

    const result = await applyPermissionGrants({
      targetUserId: 9,
      establishmentId: 'est-1',
      requested: [PERMISSIONS.access_planning],
    });

    expect(mocks.clearPin).not.toHaveBeenCalled();
    expect(result.pin_cleared).toBe(false);
  });

  it('keeps the PIN when all specific permissions are revoked', async () => {
    mocks.getUserPermissions
      .mockResolvedValueOnce([PERMISSIONS.access_pos, PERMISSIONS.access_planning])
      .mockResolvedValueOnce([PERMISSIONS.access_pos]);

    const result = await applyPermissionGrants({
      targetUserId: 9,
      establishmentId: 'est-1',
      requested: [],
    });

    expect(mocks.clearPin).not.toHaveBeenCalled();
    expect(result.pin_cleared).toBe(false);
  });

  it('closes open badges when the effective permission set changes', async () => {
    mocks.closeAllForUser.mockResolvedValue(2);
    mocks.getUserPermissions
      .mockResolvedValueOnce([PERMISSIONS.access_pos, PERMISSIONS.access_closure])
      .mockResolvedValueOnce([PERMISSIONS.access_pos, PERMISSIONS.access_planning]);

    const result = await applyPermissionGrants({
      targetUserId: 9,
      establishmentId: 'est-1',
      requested: [PERMISSIONS.access_planning],
    });

    expect(mocks.closeAllForUser).toHaveBeenCalledWith(9, 'est-1', 'permissions_changed');
    expect(result.sessions_closed).toBe(2);
  });

  it('leaves open badges alone when the effective permissions are unchanged', async () => {
    mocks.getUserPermissions
      .mockResolvedValueOnce([PERMISSIONS.access_pos, PERMISSIONS.access_planning])
      .mockResolvedValueOnce([PERMISSIONS.access_planning, PERMISSIONS.access_pos]);

    const result = await applyPermissionGrants({
      targetUserId: 9,
      establishmentId: 'est-1',
      requested: [PERMISSIONS.access_planning],
    });

    expect(mocks.closeAllForUser).not.toHaveBeenCalled();
    expect(result.sessions_closed).toBe(0);
  });

  it('does not touch a PIN that does not exist yet', async () => {
    mocks.getMembershipWithPin.mockResolvedValue({ role: 'staff', pin_hash: null });
    mocks.getUserPermissions
      .mockResolvedValueOnce([PERMISSIONS.access_pos])
      .mockResolvedValueOnce([PERMISSIONS.access_pos, PERMISSIONS.access_closure]);

    const result = await applyPermissionGrants({
      targetUserId: 9,
      establishmentId: 'est-1',
      requested: [PERMISSIONS.access_closure],
    });

    expect(mocks.clearPin).not.toHaveBeenCalled();
    expect(result.pin_cleared).toBe(false);
  });
});
