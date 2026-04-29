import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  getUserPermissions: vi.fn(),
  verifyJournalIntegrity: vi.fn(),
  getEntriesWithCountForPeriod: vi.fn(),
  getClosureBulletins: vi.fn(),
  getEntriesForPeriod: vi.fn(),
  getOrdersTotalsForPeriod: vi.fn(),
  countDailyClosuresForPeriod: vi.fn(),
}));

vi.mock('../../app', () => ({
  __esModule: true,
  default: express(),
  pool: {
    query: mocks.poolQuery,
  },
}));

vi.mock('../../utils/logger', () => ({
  Logger: {
    getInstance: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  },
}));

vi.mock('../../models/user', () => ({
  UserModel: {
    getUserPermissions: mocks.getUserPermissions,
  },
}));

vi.mock('../../models/legalJournal', () => ({
  __esModule: true,
  default: {
    verifyJournalIntegrity: mocks.verifyJournalIntegrity,
    getClosureBulletins: mocks.getClosureBulletins,
    getEntriesForPeriod: mocks.getEntriesForPeriod,
  },
  JournalQueries: {
    getEntriesWithCountForPeriod: mocks.getEntriesWithCountForPeriod,
    getJournalStatsSummary: vi.fn().mockResolvedValue({}),
    resetJournalDevOnly: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../models/legalJournal/monthlyLiveStatsRepository', () => ({
  MonthlyLiveStatsRepository: {
    getOrdersTotalsForPeriod: mocks.getOrdersTotalsForPeriod,
    countDailyClosuresForPeriod: mocks.countDailyClosuresForPeriod,
  },
}));

import journalRouter from './journal';
import complianceRouter from './compliance';
import statsRouter from './stats';

const app = express();
app.use(express.json());
app.use('/journal', journalRouter);
app.use('/compliance', complianceRouter);
app.use('/stats', statsRouter);

function tokenFor(role: 'establishment_admin' | 'staff') {
  return generateToken(
    {
      id: role === 'staff' ? 12 : 7,
      email: `${role}@example.com`,
      is_admin: false,
      role,
      establishment_id: EST,
    },
    false
  );
}

describe('legal route compliance permission gates', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.getUserPermissions.mockReset();
    mocks.verifyJournalIntegrity.mockReset();
    mocks.getEntriesWithCountForPeriod.mockReset();
    mocks.getClosureBulletins.mockReset();
    mocks.getEntriesForPeriod.mockReset();
    mocks.getOrdersTotalsForPeriod.mockReset();
    mocks.countDailyClosuresForPeriod.mockReset();

    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    mocks.verifyJournalIntegrity.mockResolvedValue({ isValid: true, errors: [] });
    mocks.getEntriesWithCountForPeriod.mockResolvedValue({ entries: [], total: 0, limit: 100, offset: 0 });
    mocks.getClosureBulletins.mockResolvedValue([]);
    mocks.getEntriesForPeriod.mockResolvedValue([]);
    mocks.getOrdersTotalsForPeriod.mockResolvedValue({ total_ttc: 0, card_total: 0, cash_total: 0 });
    mocks.countDailyClosuresForPeriod.mockResolvedValue({ closure_count: 0 });
  });

  it('denies /journal/verify without access_compliance', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);
    const res = await request(app)
      .get('/journal/verify')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);
    expect(res.status).toBe(403);
    expect(mocks.verifyJournalIntegrity).not.toHaveBeenCalled();
  });

  it('allows /journal/verify with access_compliance', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_compliance']);
    const res = await request(app)
      .get('/journal/verify')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);
    expect(res.status).toBe(200);
    expect(mocks.verifyJournalIntegrity).toHaveBeenCalledWith(EST);
  });

  it('denies /compliance/report without access_compliance', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);
    const res = await request(app)
      .get('/compliance/report?start_date=2026-01-01&end_date=2026-01-31')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);
    expect(res.status).toBe(403);
  });

  it('denies /stats/monthly-live without access_compliance', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);
    const res = await request(app)
      .get('/stats/monthly-live')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);
    expect(res.status).toBe(403);
  });
});
