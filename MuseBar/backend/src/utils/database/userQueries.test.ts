import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserQueries } from './userQueries';

describe('UserQueries', () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
  });

  it('getUserWithEstablishment / getUserByEmail return null when missing', async () => {
    query.mockResolvedValue({ rows: [] });
    await expect(UserQueries.getUserWithEstablishment({ query } as never, 1)).resolves.toBeNull();
    await expect(UserQueries.getUserByEmail({ query } as never, 'a@b.com')).resolves.toBeNull();
  });

  it('checkUserExists reports establishment membership', async () => {
    query.mockResolvedValue({ rows: [{ id: 1, establishment_id: 'e1' }] });
    await expect(UserQueries.checkUserExists({ query } as never, 'a@b.com')).resolves.toEqual({
      exists: true,
      user: { id: 1, establishment_id: 'e1' },
      hasEstablishment: true,
    });

    query.mockResolvedValue({ rows: [] });
    await expect(UserQueries.checkUserExists({ query } as never, 'none@x.com')).resolves.toEqual({
      exists: false,
    });
  });

  it('getUsersByEstablishment applies filters and sort allowlist', async () => {
    query.mockResolvedValue({ rows: [{ id: 1 }] });
    await UserQueries.getUsersByEstablishment({ query } as never, 'est-1', {
      role: 'staff',
      isActive: true,
      search: 'ada',
      limit: 10,
      offset: 2,
      sortBy: 'evil;drop',
      sortOrder: 'ASC',
    });
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('establishment_id = $1');
    expect(sql).toContain('role =');
    expect(sql).toContain('is_active');
    expect(sql).toContain('ILIKE');
    expect(sql).toContain('ORDER BY u.created_at ASC');
    expect(params[0]).toBe('est-1');
  });
});
