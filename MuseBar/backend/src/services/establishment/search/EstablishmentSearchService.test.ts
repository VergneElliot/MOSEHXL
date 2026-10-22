import { describe, expect, it, vi } from 'vitest';
import { EstablishmentSearchService } from './EstablishmentSearchService';

function logger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe('EstablishmentSearchService', () => {
  it('searchEstablishments applies filters and pagination metadata', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ count: '25' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'e1' }, { id: 'e2' }] }),
    };
    const svc = new EstablishmentSearchService(logger() as never);
    const result = await svc.searchEstablishments(
      client as never,
      {
        name: 'Café',
        email: 'a@',
        status: 'active',
        business_type: 'Bar',
        subscription_plan: 'basic',
        created_after: new Date('2026-01-01'),
        created_before: new Date('2026-12-31'),
        setup_progress_min: 10,
        setup_progress_max: 90,
      },
      { page: 2, limit: 10, sortBy: 'name', sortOrder: 'asc' }
    );

    expect(result.total).toBe(25);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(3);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrevious).toBe(true);
    expect(result.establishments).toHaveLength(2);

    const [searchSql] = client.query.mock.calls[1] as [string, unknown[]];
    expect(searchSql).toContain('LOWER(e.name) LIKE');
    expect(searchSql).toContain('ORDER BY e.name ASC');
    expect(searchSql).toContain('LIMIT');
  });

  it('searchEstablishments uses default sort column for unknown sortBy via cast', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] }),
    };
    const svc = new EstablishmentSearchService(logger() as never);
    await svc.searchEstablishments(client as never, {}, {
      page: 1,
      limit: 5,
      sortBy: 'setup_progress',
      sortOrder: 'desc',
    });
    const [sql] = client.query.mock.calls[1] as [string];
    expect(sql).toContain('progress_percentage');
  });

  it('getSearchSuggestions returns names and empty on error', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [{ name: 'Alpha' }, { name: 'Beta' }] }),
    };
    const svc = new EstablishmentSearchService(logger() as never);
    await expect(svc.getSearchSuggestions(client as never, 'a', 5)).resolves.toEqual([
      'Alpha',
      'Beta',
    ]);

    client.query.mockRejectedValue(new Error('db'));
    await expect(svc.getSearchSuggestions(client as never, 'a')).resolves.toEqual([]);
  });
});
