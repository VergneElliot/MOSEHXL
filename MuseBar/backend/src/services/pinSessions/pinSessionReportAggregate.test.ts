import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  getExactVat: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  pool: { query: mocks.query },
}));

vi.mock('../../models/legalJournal/closureOperationsMath', () => ({
  getExactVatBreakdownFromOrderItems: mocks.getExactVat,
}));

import { aggregatePinSessionReport } from './pinSessionReportAggregate';

describe('aggregatePinSessionReport', () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.getExactVat.mockReset();
    mocks.getExactVat.mockResolvedValue({
      vat_10: { amount: 0, vat: 0, ttc: 0 },
      vat_20: { amount: 10, vat: 2, ttc: 12 },
    });
  });

  it('returns null when session is missing', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      aggregatePinSessionReport('est-1', '11111111-1111-4111-8111-111111111111')
    ).resolves.toBeNull();
  });

  it('aggregates empty session with zero totals', async () => {
    const opened = new Date('2026-10-28T10:00:00.000Z');
    mocks.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            user_id: 5,
            opened_at: opened,
            closed_at: null,
            first_name: 'Ada',
            last_name: 'Lovelace',
            email: 'ada@example.com',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const snap = await aggregatePinSessionReport(
      'est-1',
      '11111111-1111-4111-8111-111111111111'
    );
    expect(snap).toMatchObject({
      informational: true,
      staff_display_name: 'Ada Lovelace',
      order_count: 0,
      total_amount: 0,
      session_closed: false,
    });
    expect(snap?.period_start).toBe(opened.toISOString());
  });

  it('sums completed orders and payment breakdown', async () => {
    const opened = new Date('2026-10-28T10:00:00.000Z');
    const closed = new Date('2026-10-28T18:00:00.000Z');
    mocks.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            user_id: 5,
            opened_at: opened,
            closed_at: closed,
            first_name: null,
            last_name: null,
            email: 'bob@example.com',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            total_amount: 12,
            payment_method: 'card',
            operation_type: 'sale',
            change_amount: null,
            tips: 0,
          },
          {
            id: 2,
            total_amount: 8,
            payment_method: 'cash',
            operation_type: 'sale',
            change_amount: null,
            tips: 0,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const snap = await aggregatePinSessionReport(
      'est-1',
      '11111111-1111-4111-8111-111111111111'
    );
    expect(snap?.staff_display_name).toBe('bob@example.com');
    expect(snap?.order_count).toBe(2);
    expect(snap?.total_amount).toBe(20);
    expect(snap?.payment_breakdown.card).toBe(12);
    expect(snap?.payment_breakdown.cash).toBe(8);
    expect(snap?.session_closed).toBe(true);
    expect(snap?.period_end).toBe(closed.toISOString());
  });
});
