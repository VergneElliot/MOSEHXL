import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  pool: {
    query: mocks.poolQuery,
  },
}));

import { UserModel } from './user';

describe('UserModel establishment_admin permission mode', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    delete process.env.ESTABLISHMENT_ADMIN_PERMISSION_MODE;
  });

  it('uses implicit_all by default for establishment_admin', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [{ role: 'establishment_admin' }] })
      .mockResolvedValueOnce({ rows: [{ name: 'access_pos' }, { name: 'access_settings' }] });

    const perms = await UserModel.getUserPermissions(10);

    expect(perms).toEqual(['access_pos', 'access_settings']);
    expect(mocks.poolQuery).toHaveBeenNthCalledWith(1, 'SELECT role FROM users WHERE id = $1', [10]);
    expect(mocks.poolQuery).toHaveBeenNthCalledWith(2, 'SELECT name FROM permissions');
  });

  it('uses explicit_only mode when configured', async () => {
    process.env.ESTABLISHMENT_ADMIN_PERMISSION_MODE = 'explicit_only';

    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [{ role: 'establishment_admin' }] })
      .mockResolvedValueOnce({ rows: [{ name: 'access_pos' }] });

    const perms = await UserModel.getUserPermissions(11);

    expect(perms).toEqual(['access_pos']);
    expect(mocks.poolQuery).toHaveBeenNthCalledWith(1, 'SELECT role FROM users WHERE id = $1', [11]);
    expect(String(mocks.poolQuery.mock.calls[1]?.[0] ?? '')).toContain('JOIN user_permissions up');
  });
});
