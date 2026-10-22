import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  pool: { query: mocks.query },
}));

import { getJournalStatsSummary, getSaleSummaryForPeriod } from './journalStats';

describe('journalStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSaleSummaryForPeriod coerces numeric strings', async () => {
    mocks.query.mockResolvedValue({
      rows: [{ sale_count: '3', sale_amount: '45.5', sale_vat: '7.2' }],
    });
    const start = new Date('2026-10-01T00:00:00.000Z');
    const end = new Date('2026-10-02T00:00:00.000Z');
    await expect(getSaleSummaryForPeriod('est-1', start, end)).resolves.toEqual({
      count: 3,
      amount: 45.5,
      vat: 7.2,
    });
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("transaction_type = 'SALE'"),
      ['est-1', start, end]
    );
  });

  it('getSaleSummaryForPeriod defaults empty rows to zero', async () => {
    mocks.query.mockResolvedValue({ rows: [] });
    await expect(
      getSaleSummaryForPeriod('est-1', new Date(), new Date())
    ).resolves.toEqual({ count: 0, amount: 0, vat: 0 });
  });

  it('getJournalStatsSummary returns first row', async () => {
    mocks.query.mockResolvedValue({
      rows: [{ total_entries: '10', sales_count: '8' }],
    });
    await expect(getJournalStatsSummary('est-1')).resolves.toEqual({
      total_entries: '10',
      sales_count: '8',
    });
  });
});
