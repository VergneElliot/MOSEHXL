import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  getEntriesForPeriod: vi.fn(),
  getClosureBulletins: vi.fn(),
  verifyJournalIntegrity: vi.fn(),
  resolveArchiveRegisterId: vi.fn(() => 'CR-est-1'),
}));

vi.mock('../db/pool', () => ({
  pool: { query: mocks.poolQuery },
}));

vi.mock('./legalJournal', () => ({
  __esModule: true,
  default: {
    getEntriesForPeriod: mocks.getEntriesForPeriod,
    getClosureBulletins: mocks.getClosureBulletins,
    verifyJournalIntegrity: mocks.verifyJournalIntegrity,
  },
}));

vi.mock('./archiveCrypto', () => ({
  resolveArchiveRegisterId: mocks.resolveArchiveRegisterId,
}));

import { buildArchiveExportPayload } from './archiveExportPayload';

describe('buildArchiveExportPayload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEntriesForPeriod.mockResolvedValue([
      { transaction_type: 'SALE', amount: 100, vat_amount: 20 },
      { transaction_type: 'REFUND', amount: -10, vat_amount: -2 },
    ]);
    mocks.getClosureBulletins.mockResolvedValue([]);
    mocks.verifyJournalIntegrity.mockResolvedValue({ valid: true });
  });

  it('rejects DAILY without establishment_id', async () => {
    await expect(
      buildArchiveExportPayload({
        export_type: 'DAILY',
        period_start: new Date('2026-10-01T00:00:00.000Z'),
      } as never)
    ).rejects.toThrow(/establishment_id/);
  });

  it('builds DAILY summary from SALE entries only', async () => {
    const payload = await buildArchiveExportPayload({
      export_type: 'DAILY',
      establishment_id: 'est-1',
      period_start: new Date('2026-10-01T10:00:00.000Z'),
      period_end: new Date('2026-10-01T20:00:00.000Z'),
    } as never);

    expect(payload.export_type).toBe('DAILY');
    expect(payload.summary).toEqual({
      total_transactions: 1,
      total_amount: 100,
      total_vat: 20,
    });
    expect((payload.compliance_info as { register_id: string }).register_id).toBe('CR-est-1');
  });

  it('builds MONTHLY period from period_start month bounds', async () => {
    const payload = await buildArchiveExportPayload({
      export_type: 'MONTHLY',
      establishment_id: 'est-1',
      period_start: new Date('2026-09-15T12:00:00.000Z'),
    } as never);
    expect(payload.export_type).toBe('MONTHLY');
    const period = payload.period as { start: string; end: string };
    expect(period.start.startsWith('2026-09-01')).toBe(true);
    expect(period.end.startsWith('2026-09-30')).toBe(true);
  });

  it('builds FULL export with journal rows and integrity', async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [{ sequence_number: 1 }] });
    mocks.getClosureBulletins.mockResolvedValue([{ id: 1 }]);
    const payload = await buildArchiveExportPayload({
      export_type: 'FULL',
      establishment_id: 'est-1',
    } as never);
    expect(payload.export_type).toBe('FULL');
    expect(payload.journal_entries).toHaveLength(1);
    expect(payload.closure_bulletins).toEqual([{ id: 1 }]);
    expect(mocks.verifyJournalIntegrity).toHaveBeenCalledWith('est-1');
  });
});
