import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  pool: { query: mocks.poolQuery },
}));

vi.mock('../utils/logger', () => ({
  logError: mocks.logError,
}));

import { AuditTrailModel } from './auditTrail';

describe('AuditTrailModel', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.logError.mockReset();
  });

  it('logAction coerces invalid IPs to null and inserts', async () => {
    mocks.poolQuery.mockResolvedValue({
      rows: [{ id: 1, action_type: 'TEST', ip_address: null }],
    });
    const row = await AuditTrailModel.logAction({
      establishment_id: 'est-1',
      user_id: '7',
      action_type: 'TEST',
      ip_address: 'not-an-ip',
      action_details: { ok: true },
    });
    expect(row.id).toBe(1);
    const values = mocks.poolQuery.mock.calls[0][1] as unknown[];
    expect(values[5]).toBeNull();
  });

  it('logAction accepts IPv4 / mapped IPv6 and falls back to first establishment', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [{ id: 'fallback-est' }] }) // resolveFallback
      .mockResolvedValueOnce({ rows: [{ id: 2 }] });
    await AuditTrailModel.logAction({
      action_type: 'BG',
      ip_address: '::ffff:10.0.0.1',
    });
    const values = mocks.poolQuery.mock.calls[1][1] as unknown[];
    expect(values[5]).toBe('10.0.0.1');
    expect(values[8]).toBe('fallback-est');
  });

  it('logActionBestEffort swallows errors', async () => {
    mocks.poolQuery.mockRejectedValue(new Error('db'));
    await expect(
      AuditTrailModel.logActionBestEffort({ action_type: 'X', establishment_id: 'e' })
    ).resolves.toBeUndefined();
  });

  it('getOrderAuditEntries and getEstablishmentAuditTrail filter', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 9 }] });

    await expect(AuditTrailModel.getOrderAuditEntries('est-1', 42)).resolves.toEqual([{ id: 1 }]);
    const page = await AuditTrailModel.getEstablishmentAuditTrail('est-1', {
      user_id: '7',
      action_type: 'SALE',
      resource_type: 'ORDER',
      start: '2026-01-01',
      end: '2026-01-31',
      limit: 10,
      offset: 0,
    });
    expect(page).toEqual({ entries: [{ id: 9 }], total: 1 });
  });
});
