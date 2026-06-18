import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn().mockResolvedValue({ rows: [{ id: 1 }] }),
}));

vi.mock('../../db/pool', () => ({
  pool: {
    query: mocks.poolQuery,
  },
}));

import { JournalQueries } from './journalQueries';

describe('JournalQueries.insertEntry', () => {
  it('uses 13 SQL placeholders for 13 bound values', async () => {
    mocks.poolQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    await JournalQueries.insertEntry(
      1,
      'establishment-11111111-1111-1111-1111-111111111111',
      'SALE',
      42,
      100,
      20,
      'card',
      { source: 'test' },
      'prev-hash',
      'curr-hash',
      new Date('2026-04-28T12:00:00.000Z'),
      '7',
      'register-a'
    );

    expect(mocks.poolQuery).toHaveBeenCalledTimes(1);

    const [sql, values] = mocks.poolQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)');
    expect(sql).not.toContain('$14');
    expect(values).toHaveLength(13);
  });
});
