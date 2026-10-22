import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  pool: { query: mocks.poolQuery },
}));

import { EstablishmentQueries } from './establishmentQueries';

describe('EstablishmentQueries', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
  });

  it('getEstablishmentById returns row or null', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [{ id: 'e1' }] });
    await expect(EstablishmentQueries.getEstablishmentById({ query: mocks.poolQuery } as never, 'e1')).resolves.toEqual({
      id: 'e1',
    });
    mocks.poolQuery.mockResolvedValue({ rows: [] });
    await expect(
      EstablishmentQueries.getEstablishmentById({ query: mocks.poolQuery } as never, 'missing')
    ).resolves.toBeNull();
  });

  it('getEstablishmentByEmail queries by email', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [{ id: 'e1', email: 'a@b.com' }] });
    const row = await EstablishmentQueries.getEstablishmentByEmail(
      { query: mocks.poolQuery } as never,
      'a@b.com'
    );
    expect(row?.email).toBe('a@b.com');
    expect(mocks.poolQuery.mock.calls[0][1]).toEqual(['a@b.com']);
  });

  it('getAllEstablishments applies status/limit/offset and sort allowlist', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [{ id: 'e1' }] });
    await EstablishmentQueries.getAllEstablishments({ query: mocks.poolQuery } as never, {
      status: 'active',
      limit: 10,
      offset: 5,
      sortBy: 'hack',
      sortOrder: 'ASC',
    });
    const [sql, params] = mocks.poolQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('WHERE status = $1');
    expect(sql).toContain('ORDER BY created_at ASC');
    expect(sql).toContain('LIMIT');
    expect(sql).toContain('OFFSET');
    expect(params).toEqual(['active', 10, 5]);
  });

  it('updateEstablishmentStatus optionally sets activated_at', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [{ id: 'e1', status: 'active' }] });
    const activatedAt = new Date('2026-01-01T00:00:00.000Z');
    await EstablishmentQueries.updateEstablishmentStatus(
      { query: mocks.poolQuery } as never,
      'e1',
      'active',
      activatedAt
    );
    const [sql, params] = mocks.poolQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('activated_at');
    expect(params).toEqual(['e1', 'active', activatedAt]);
  });
});
