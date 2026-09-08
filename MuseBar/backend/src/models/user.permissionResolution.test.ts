import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS, SPECIFIC_PERMISSIONS } from '@mosehxl/types';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  pool: {
    query: mocks.poolQuery,
  },
}));

import { UserModel } from './user';

describe('UserModel.getUserPermissions', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
  });

  it('gives establishment admins every permission without reading grants', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({
        rows: [{ role: 'establishment_admin', establishment_id: 'est-1' }],
      })
      .mockResolvedValueOnce({ rows: [{ role: 'establishment_admin' }] });

    const perms = await UserModel.getUserPermissions(10, 'est-1');

    expect(perms).toContain(PERMISSIONS.access_pos);
    expect(perms).toContain(PERMISSIONS.access_compliance);
    expect(perms).toHaveLength(Object.keys(PERMISSIONS).length);
    // No third query: grants are irrelevant for an admin.
    expect(mocks.poolQuery).toHaveBeenCalledTimes(2);
  });

  it('gives staff the basic tier even with no grants', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [{ role: 'staff', establishment_id: 'est-1' }] })
      .mockResolvedValueOnce({ rows: [{ role: 'staff' }] })
      .mockResolvedValueOnce({ rows: [] });

    const perms = await UserModel.getUserPermissions(11, 'est-1');

    expect(perms).toEqual([PERMISSIONS.access_pos]);
    expect(String(mocks.poolQuery.mock.calls[2]?.[0] ?? '')).toContain(
      'JOIN user_permissions up'
    );
  });

  it('adds explicit specific grants to the basic tier', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [{ role: 'staff', establishment_id: 'est-1' }] })
      .mockResolvedValueOnce({ rows: [{ role: 'staff' }] })
      .mockResolvedValueOnce({
        rows: [{ name: PERMISSIONS.access_planning }, { name: PERMISSIONS.orders_cancel }],
      });

    const perms = await UserModel.getUserPermissions(12, 'est-1');

    expect(perms).toContain(PERMISSIONS.access_pos);
    expect(perms).toContain(PERMISSIONS.access_planning);
    expect(perms).toContain(PERMISSIONS.orders_cancel);
    expect(perms).not.toContain(PERMISSIONS.access_settings);
  });

  it('drops grants that are no longer part of the registry', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [{ role: 'staff', establishment_id: 'est-1' }] })
      .mockResolvedValueOnce({ rows: [{ role: 'staff' }] })
      .mockResolvedValueOnce({ rows: [{ name: 'access_history' }] });

    const perms = await UserModel.getUserPermissions(13, 'est-1');

    expect(perms).toEqual([PERMISSIONS.access_pos]);
  });

  it('returns nothing without an establishment context', async () => {
    mocks.poolQuery.mockResolvedValueOnce({
      rows: [{ role: 'staff', establishment_id: null }],
    });

    expect(await UserModel.getUserPermissions(14, null)).toEqual([]);
  });

  it('never resolves a specific permission implicitly for staff', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [{ role: 'staff', establishment_id: 'est-1' }] })
      .mockResolvedValueOnce({ rows: [{ role: 'staff' }] })
      .mockResolvedValueOnce({ rows: [] });

    const perms = await UserModel.getUserPermissions(15, 'est-1');

    for (const specific of SPECIFIC_PERMISSIONS) {
      expect(perms).not.toContain(specific);
    }
  });
});
