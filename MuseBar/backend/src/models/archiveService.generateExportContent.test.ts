import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  createDailyClosure: vi.fn(),
  getEntriesForPeriod: vi.fn(),
  getClosureBulletins: vi.fn(),
  verifyJournalIntegrity: vi.fn(),
}));

vi.mock('../app', () => ({
  pool: {
    query: mocks.poolQuery,
  },
}));

vi.mock('./legalJournal', () => ({
  __esModule: true,
  default: {
    createDailyClosure: mocks.createDailyClosure,
    getEntriesForPeriod: mocks.getEntriesForPeriod,
    getClosureBulletins: mocks.getClosureBulletins,
    verifyJournalIntegrity: mocks.verifyJournalIntegrity,
  },
}));

import { ArchiveService } from './archiveService';

describe('ArchiveService.generateExportContent', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.createDailyClosure.mockReset();
    mocks.getEntriesForPeriod.mockReset();
    mocks.getClosureBulletins.mockReset();
    mocks.verifyJournalIntegrity.mockReset();

    mocks.getEntriesForPeriod.mockResolvedValue([
      { transaction_type: 'SALE', amount: 100, vat_amount: 20 },
      { transaction_type: 'REFUND', amount: -10, vat_amount: -2 },
      { transaction_type: 'SALE', amount: 50, vat_amount: 10 },
    ]);
    mocks.getClosureBulletins.mockResolvedValue([]);
  });

  it('DAILY export does not create closure bulletin as side effect', async () => {
    const json = await (ArchiveService as unknown as {
      generateExportContent: (input: {
        export_type: 'DAILY';
        period_start: Date;
        period_end: Date;
        format: 'JSON';
        created_by: string;
        establishment_id: string;
      }) => Promise<string>;
    }).generateExportContent({
      export_type: 'DAILY',
      period_start: new Date('2026-04-29T10:00:00.000Z'),
      period_end: new Date('2026-04-29T11:00:00.000Z'),
      format: 'JSON',
      created_by: '22',
      establishment_id: '11111111-1111-4111-8111-111111111111',
    });

    const parsed = JSON.parse(json);
    expect(parsed.export_type).toBe('DAILY');
    expect(parsed.summary.total_transactions).toBe(2);
    expect(parsed.summary.total_amount).toBe(150);
    expect(parsed.summary.total_vat).toBe(30);
    expect(mocks.createDailyClosure).not.toHaveBeenCalled();
    expect(mocks.getEntriesForPeriod).toHaveBeenCalled();
  });

  it('supports ANNUAL export generation with legal scoped entries', async () => {
    const json = await (ArchiveService as unknown as {
      generateExportContent: (input: {
        export_type: 'ANNUAL';
        period_start: Date;
        format: 'JSON';
        created_by: string;
        establishment_id: string;
      }) => Promise<string>;
    }).generateExportContent({
      export_type: 'ANNUAL',
      period_start: new Date('2026-08-12T00:00:00.000Z'),
      format: 'JSON',
      created_by: '22',
      establishment_id: '11111111-1111-4111-8111-111111111111',
    });

    const parsed = JSON.parse(json);
    expect(parsed.export_type).toBe('ANNUAL');
    expect(parsed.period.start).toBe('2026-01-01T00:00:00.000Z');
    expect(parsed.period.end).toBe('2026-12-31T23:59:59.999Z');
    expect(parsed.summary.total_transactions).toBe(2);
    expect(parsed.compliance_info.legal_reference).toBe('Article 286-I-3 bis du CGI');
  });
});
