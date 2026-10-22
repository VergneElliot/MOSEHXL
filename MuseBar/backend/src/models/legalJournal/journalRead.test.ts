import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  pool: { query: mocks.poolQuery },
}));

vi.mock('../../utils/logger', () => ({
  Logger: {
    getInstance: () => ({ error: mocks.loggerError }),
  },
}));

import {
  closureBulletinExists,
  findClosedDailyBulletinsForBusinessDay,
  getClosureBulletins,
  getClosureBulletinsPaginated,
  getEntries,
  getEntriesByType,
  getEntriesForOrder,
  getEntriesForPeriod,
  getEntriesWithCountForPeriod,
  getLastClosedDailyPeriodEnd,
  getLastFondDeCaisse,
} from './journalRead';

describe('journalRead', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.loggerError.mockReset();
  });

  it('getEntriesForPeriod returns rows for the window', async () => {
    const rows = [{ id: 1, sequence_number: 1 }];
    mocks.poolQuery.mockResolvedValue({ rows });
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-01-02T00:00:00Z');
    await expect(getEntriesForPeriod('est-1', start, end)).resolves.toEqual(rows);
    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('timestamp >='),
      ['est-1', start, end]
    );
  });

  it('getEntries applies optional limit and offset', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [] });
    await getEntries('est-1', 10, 5);
    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringMatching(/LIMIT \$2 OFFSET \$3/),
      ['est-1', 10, 5]
    );
  });

  it('getEntriesWithCountForPeriod counts with and without date filter', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ count: '3' }] })
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ count: '9' }] });

    const withDates = await getEntriesWithCountForPeriod({
      establishment_id: 'est-1',
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      limit: 20,
      offset: 0,
    });
    expect(withDates.total).toBe(3);
    expect(withDates.entries).toHaveLength(1);

    const without = await getEntriesWithCountForPeriod({
      establishment_id: 'est-1',
      limit: 5,
      offset: 10,
    });
    expect(without.total).toBe(9);
    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('COUNT(*)'),
      ['est-1']
    );
  });

  it('getEntriesByType and getEntriesForOrder query as expected', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [{ id: 7 }] });
    await expect(getEntriesByType('est-1', 'SALE', 2)).resolves.toEqual([{ id: 7 }]);
    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('transaction_type = $2'),
      ['est-1', 'SALE', 2]
    );

    await getEntriesForOrder('est-1', 42);
    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('order_id = $1'),
      [42, 'est-1']
    );
  });

  it('getClosureBulletins parses JSON fields and defaults tips/change', async () => {
    mocks.poolQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          vat_breakdown: '{"20":{"amount":10,"vat":2}}',
          payment_methods_breakdown: { card: 12 },
          fond_de_caisse: undefined,
          tips_total: null,
          change_total: null,
        },
        {
          id: 2,
          vat_breakdown: 'not-json',
          payment_methods_breakdown: null,
          fond_de_caisse: 50,
          tips_total: 3,
          change_total: 1,
        },
      ],
    });

    const bulletins = await getClosureBulletins('est-1', 'DAILY');
    expect(bulletins[0]?.vat_breakdown).toEqual({ '20': { amount: 10, vat: 2 } });
    expect(bulletins[0]?.fond_de_caisse).toBe(0);
    expect(bulletins[0]?.tips_total).toBe(0);
    expect(bulletins[1]?.vat_breakdown).toEqual({});
    expect(bulletins[1]?.fond_de_caisse).toBe(50);
    expect(mocks.loggerError).toHaveBeenCalled();
  });

  it('getClosureBulletinsPaginated applies limit/offset and returns total', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [{ total: 4 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 9,
            vat_breakdown: {},
            payment_methods_breakdown: {},
            fond_de_caisse: 0,
            tips_total: 0,
            change_total: 0,
          },
        ],
      });

    const page = await getClosureBulletinsPaginated('est-1', 'DAILY', {
      limit: 10,
      offset: 2,
    });
    expect(page.total).toBe(4);
    expect(page.bulletins).toHaveLength(1);
    expect(mocks.poolQuery).toHaveBeenLastCalledWith(
      expect.stringMatching(/LIMIT \$3 OFFSET \$4/),
      expect.arrayContaining(['DAILY', 'est-1', 10, 2])
    );
  });

  it('getLastFondDeCaisse handles missing, numeric, and invalid values', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ fond_de_caisse: 12.5 }] })
      .mockResolvedValueOnce({ rows: [{ fond_de_caisse: 'not-a-number' }] });

    await expect(getLastFondDeCaisse('est-1')).resolves.toBeNull();
    await expect(getLastFondDeCaisse('est-1')).resolves.toBe(12.5);
    await expect(getLastFondDeCaisse('est-1')).resolves.toBeNull();
  });

  it('getLastClosedDailyPeriodEnd returns Date or null', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ period_end: '2026-05-20T22:00:00.000Z' }] })
      .mockResolvedValueOnce({ rows: [{ period_end: new Date('2026-05-21T22:00:00.000Z') }] });

    await expect(getLastClosedDailyPeriodEnd('est-1')).resolves.toBeNull();
    const asString = await getLastClosedDailyPeriodEnd('est-1');
    expect(asString?.toISOString()).toBe('2026-05-20T22:00:00.000Z');
    const asDate = await getLastClosedDailyPeriodEnd('est-1');
    expect(asDate?.toISOString()).toBe('2026-05-21T22:00:00.000Z');
  });

  it('closureBulletinExists and findClosedDailyBulletinsForBusinessDay', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: '3', closure_hash: 'abc', total_amount: '99.5' }],
      });

    const start = new Date('2026-01-01');
    const end = new Date('2026-01-02');
    await expect(closureBulletinExists('DAILY', start, end, 'est-1')).resolves.toBe(true);
    await expect(closureBulletinExists('DAILY', start, end, 'est-1')).resolves.toBe(false);

    const found = await findClosedDailyBulletinsForBusinessDay(
      'est-1',
      start,
      'Europe/Paris'
    );
    expect(found).toEqual([{ id: 3, closure_hash: 'abc', total_amount: 99.5 }]);
  });
});
