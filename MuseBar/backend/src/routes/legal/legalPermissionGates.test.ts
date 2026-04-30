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

  it('denies /journal/entries without access_compliance', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);

    const res = await request(app)
      .get('/journal/entries')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(403);
    expect(mocks.getEntriesWithCountForPeriod).not.toHaveBeenCalled();
  });

  it('allows /journal/entries with access_compliance and passes scoped query options', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_compliance']);
    mocks.getEntriesWithCountForPeriod.mockResolvedValue({
      entries: [{ id: 1, transaction_type: 'SALE' }],
      total: 1,
      limit: 50,
      offset: 10,
    });

    const res = await request(app)
      .get('/journal/entries?start_date=2026-02-01&end_date=2026-02-29&limit=50&offset=10')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(200);
    expect(mocks.getEntriesWithCountForPeriod).toHaveBeenCalledWith({
      establishment_id: EST,
      start_date: '2026-02-01',
      end_date: '2026-02-29',
      limit: 50,
      offset: 10,
    });
    expect(res.body.total).toBe(1);
    expect(res.body.limit).toBe(50);
    expect(res.body.offset).toBe(10);
  });

  it('uses default pagination for /journal/entries when limit/offset are omitted', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_compliance']);
    mocks.getEntriesWithCountForPeriod.mockResolvedValue({
      entries: [],
      total: 0,
      limit: 100,
      offset: 0,
    });

    const res = await request(app)
      .get('/journal/entries')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(200);
    expect(mocks.getEntriesWithCountForPeriod).toHaveBeenCalledWith({
      establishment_id: EST,
      start_date: undefined,
      end_date: undefined,
      limit: 100,
      offset: 0,
    });
    expect(res.body.limit).toBe(100);
    expect(res.body.offset).toBe(0);
  });

  it('denies /journal/stats without access_compliance', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);

    const res = await request(app)
      .get('/journal/stats')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(403);
  });

  it('allows /journal/stats with access_compliance', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_compliance']);

    const res = await request(app)
      .get('/journal/stats')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(200);
  });

  it('denies /journal/reset for non-admin users', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_compliance']);

    const res = await request(app)
      .post('/journal/reset')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(403);
  });

  it('denies /compliance/report without access_compliance', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);
    const res = await request(app)
      .get('/compliance/report?start_date=2026-01-01&end_date=2026-01-31')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);
    expect(res.status).toBe(403);
  });

  it('allows /compliance/report with access_compliance and executes report queries', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_compliance']);
    mocks.getEntriesForPeriod.mockResolvedValue([
      { transaction_type: 'SALE' },
      { transaction_type: 'REFUND' },
    ]);
    mocks.getClosureBulletins.mockResolvedValue([
      {
        closure_type: 'DAILY',
        period_start: '2026-01-10T00:00:00.000Z',
      },
    ]);

    const res = await request(app)
      .get('/compliance/report?start_date=2026-01-01&end_date=2026-01-31')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(200);
    expect(mocks.getEntriesForPeriod).toHaveBeenCalledWith(
      EST,
      expect.any(Date),
      expect.any(Date)
    );
    expect(mocks.getClosureBulletins).toHaveBeenCalledWith(EST);
    expect(res.body.period?.start_date).toBeDefined();
    expect(res.body.journal_entries?.total).toBe(2);
  });

  it('returns 400 on /compliance/report when dates are missing despite access_compliance', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_compliance']);

    const res = await request(app)
      .get('/compliance/report')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Start date and end date are required');
    expect(mocks.getEntriesForPeriod).not.toHaveBeenCalled();
  });

  it('returns 400 on /compliance/report for invalid dates despite access_compliance', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_compliance']);

    const res = await request(app)
      .get('/compliance/report?start_date=nope&end_date=still-nope')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid date format');
    expect(mocks.getEntriesForPeriod).not.toHaveBeenCalled();
  });

  it('allows /compliance/status with access_compliance and returns compliance snapshot', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_compliance']);
    mocks.verifyJournalIntegrity.mockResolvedValue({ isValid: true, errors: [] });
    mocks.getClosureBulletins.mockResolvedValue([
      { closure_type: 'DAILY', period_start: new Date().toISOString() },
    ]);

    const res = await request(app)
      .get('/compliance/status')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(200);
    expect(mocks.verifyJournalIntegrity).toHaveBeenCalledWith(EST);
    expect(mocks.getClosureBulletins).toHaveBeenCalledWith(EST, 'DAILY');
    expect(res.body.compliance_status).toBe('COMPLIANT');
    expect(res.body.daily_closure_status).toBe('COMPLETED');
  });

  it('denies /compliance/status without access_compliance', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);

    const res = await request(app)
      .get('/compliance/status')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(403);
    expect(mocks.verifyJournalIntegrity).not.toHaveBeenCalled();
  });

  it('allows /compliance/requirements with access_compliance', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_compliance']);

    const res = await request(app)
      .get('/compliance/requirements')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.requirements)).toBe(true);
    expect(res.body.requirements.length).toBeGreaterThan(0);
  });

  it('denies /compliance/requirements without access_compliance', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);

    const res = await request(app)
      .get('/compliance/requirements')
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

  it('allows /stats/monthly-live with access_compliance and returns monthly live metrics', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_compliance']);
    mocks.getOrdersTotalsForPeriod.mockResolvedValue({
      total_ttc: 320.5,
      card_total: 200.25,
      cash_total: 120.25,
    });
    mocks.countDailyClosuresForPeriod.mockResolvedValue({ closure_count: 9 });

    const res = await request(app)
      .get('/stats/monthly-live')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(200);
    expect(mocks.getOrdersTotalsForPeriod).toHaveBeenCalledWith(
      expect.objectContaining({
        establishmentId: EST,
        start: expect.any(Date),
        end: expect.any(Date),
      })
    );
    expect(mocks.countDailyClosuresForPeriod).toHaveBeenCalledWith(
      expect.objectContaining({
        establishmentId: EST,
        start: expect.any(Date),
        end: expect.any(Date),
      })
    );
    expect(res.body.total_ttc).toBe(320.5);
    expect(res.body.closure_count).toBe(9);
  });
});
