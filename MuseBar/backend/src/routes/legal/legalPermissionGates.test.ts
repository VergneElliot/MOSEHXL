import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Test } from 'supertest';
import express from 'express';
import { generateToken } from '../auth';
import { errorHandler } from '../../middleware/errorHandler';
import { pinActorTokenFor, withPinActor } from '../../test/pinActorTestUtils';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  verifyJournalIntegrity: vi.fn(),
  getEntriesWithCountForPeriod: vi.fn(),
  getJournalStatsSummary: vi.fn(),
  getClosureBulletins: vi.fn(),
  getEntriesForPeriod: vi.fn(),
  getOrdersTotalsForPeriod: vi.fn(),
  countDailyClosuresForPeriod: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
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

vi.mock('../../models/legalJournal', () => ({
  __esModule: true,
  default: {
    verifyJournalIntegrity: mocks.verifyJournalIntegrity,
    getClosureBulletins: mocks.getClosureBulletins,
    getEntriesForPeriod: mocks.getEntriesForPeriod,
  },
  JournalQueries: {
    getEntriesWithCountForPeriod: mocks.getEntriesWithCountForPeriod,
    getJournalStatsSummary: mocks.getJournalStatsSummary,
    resetJournalDevOnly: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../models/legalJournal/monthlyLiveStatsRepository', () => ({
  MonthlyLiveStatsRepository: {
    getOrdersTotalsForPeriod: mocks.getOrdersTotalsForPeriod,
    countDailyClosuresForPeriod: mocks.countDailyClosuresForPeriod,
  },
}));

vi.mock('../../permissions/registry', () => ({
  P: {
    access_compliance: 'access_compliance',
    access_closure: 'access_closure',
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
app.use(errorHandler);

function tokenFor(role: 'system_admin' | 'establishment_admin' | 'staff', establishmentId: string | null = EST) {
  return generateToken(
    {
      id: role === 'staff' ? 12 : role === 'system_admin' ? 1 : 7,
      email: `${role}@example.com`,
      is_admin: false,
      role,
      establishment_id: establishmentId,
    },
    false
  );
}

function pinWith(permissions: string[]) {
  return pinActorTokenFor({ id: 12, establishmentId: EST, permissions });
}

function adminPin() {
  return pinActorTokenFor({ id: 7, establishmentId: EST, role: 'establishment_admin' });
}

function withStaffPin(req: Test, permissions: string[]) {
  return withPinActor(
    req.set('Authorization', `Bearer ${tokenFor('staff')}`),
    pinWith(permissions)
  );
}

function withAdminPin(req: Test) {
  return withPinActor(
    req.set('Authorization', `Bearer ${tokenFor('establishment_admin')}`),
    adminPin()
  );
}

describe('legal route compliance permission gates', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.verifyJournalIntegrity.mockReset();
    mocks.getEntriesWithCountForPeriod.mockReset();
    mocks.getJournalStatsSummary.mockReset();
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
    mocks.getJournalStatsSummary.mockResolvedValue({});
    mocks.getClosureBulletins.mockResolvedValue([]);
    mocks.getEntriesForPeriod.mockResolvedValue([]);
    mocks.getOrdersTotalsForPeriod.mockResolvedValue({ total_ttc: 0, card_total: 0, cash_total: 0 });
    mocks.countDailyClosuresForPeriod.mockResolvedValue({ closure_count: 0 });
  });

  it('denies access with the account JWT alone (no PIN actor)', async () => {
    const res = await request(app)
      .get('/journal/verify')
      .set('Authorization', `Bearer ${tokenFor('establishment_admin')}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PIN_ACTOR_REQUIRED');
    expect(mocks.verifyJournalIntegrity).not.toHaveBeenCalled();
  });

  it('denies /journal/verify without access_compliance', async () => {
    const res = await withStaffPin(request(app).get('/journal/verify'), []);
    expect(res.status).toBe(403);
    expect(mocks.verifyJournalIntegrity).not.toHaveBeenCalled();
  });

  it('allows /journal/verify with access_compliance', async () => {
    const res = await withStaffPin(request(app).get('/journal/verify'), ['access_compliance']);
    expect(res.status).toBe(200);
    expect(mocks.verifyJournalIntegrity).toHaveBeenCalledWith(EST);
  });

  it('allows /journal/verify for establishment_admin without explicit permissions', async () => {
    const res = await withAdminPin(request(app).get('/journal/verify'));
    expect(res.status).toBe(200);
    expect(mocks.verifyJournalIntegrity).toHaveBeenCalledWith(EST);
  });

  it('denies /journal/entries without access_compliance', async () => {
    const res = await withStaffPin(request(app).get('/journal/entries'), []);

    expect(res.status).toBe(403);
    expect(mocks.getEntriesWithCountForPeriod).not.toHaveBeenCalled();
  });

  it('allows /journal/entries with access_compliance and passes scoped query options', async () => {
    mocks.getEntriesWithCountForPeriod.mockResolvedValue({
      entries: [{ id: 1, transaction_type: 'SALE' }],
      total: 1,
      limit: 50,
      offset: 10,
    });

    const res = await withStaffPin(
      request(app).get('/journal/entries?start_date=2026-02-01&end_date=2026-02-29&limit=50&offset=10'),
      ['access_compliance']
    );

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
    mocks.getEntriesWithCountForPeriod.mockResolvedValue({
      entries: [],
      total: 0,
      limit: 100,
      offset: 0,
    });

    const res = await withStaffPin(request(app).get('/journal/entries'), ['access_compliance']);

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
    const res = await withStaffPin(request(app).get('/journal/stats'), []);

    expect(res.status).toBe(403);
  });

  it('allows /journal/stats with access_compliance', async () => {
    const res = await withStaffPin(request(app).get('/journal/stats'), ['access_compliance']);

    expect(res.status).toBe(200);
  });

  it('allows /journal/stats for establishment_admin PIN without explicit permissions', async () => {
    const res = await withAdminPin(request(app).get('/journal/stats'));

    expect(res.status).toBe(200);
    expect(mocks.getJournalStatsSummary).toHaveBeenCalledWith(EST);
  });

  it('returns 403 on /journal/stats when system_admin has no establishment context', async () => {
    const res = await withPinActor(
      request(app)
        .get('/journal/stats')
        .set('Authorization', `Bearer ${tokenFor('system_admin', null)}`),
      pinActorTokenFor({ establishmentId: EST, permissions: ['access_compliance'] })
    );

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PIN_ACTOR_REQUIRED');
    expect(mocks.getJournalStatsSummary).not.toHaveBeenCalled();
  });

  it('denies /journal/reset for non-admin users', async () => {
    const res = await withStaffPin(request(app).post('/journal/reset'), ['access_compliance']);

    expect(res.status).toBe(403);
  });

  it('denies /compliance/report without access_compliance', async () => {
    const res = await withStaffPin(
      request(app).get('/compliance/report?start_date=2026-01-01&end_date=2026-01-31'),
      []
    );
    expect(res.status).toBe(403);
  });

  it('allows /compliance/report with access_compliance and executes report queries', async () => {
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

    const res = await withStaffPin(
      request(app).get('/compliance/report?start_date=2026-01-01&end_date=2026-01-31'),
      ['access_compliance']
    );

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
    const res = await withStaffPin(request(app).get('/compliance/report'), ['access_compliance']);

    expect(res.status).toBe(400);
    expect(res.body.error?.message).toBe('Start date and end date are required');
    expect(mocks.getEntriesForPeriod).not.toHaveBeenCalled();
  });

  it('returns 400 on /compliance/report for invalid dates despite access_compliance', async () => {
    const res = await withStaffPin(
      request(app).get('/compliance/report?start_date=nope&end_date=still-nope'),
      ['access_compliance']
    );

    expect(res.status).toBe(400);
    expect(res.body.error?.message).toBe('Invalid date format');
    expect(mocks.getEntriesForPeriod).not.toHaveBeenCalled();
  });

  it('allows /compliance/status with access_compliance and returns compliance snapshot', async () => {
    mocks.verifyJournalIntegrity.mockResolvedValue({ isValid: true, errors: [] });
    mocks.getClosureBulletins.mockResolvedValue([
      { closure_type: 'DAILY', period_start: new Date().toISOString() },
    ]);

    const res = await withStaffPin(request(app).get('/compliance/status'), ['access_compliance']);

    expect(res.status).toBe(200);
    expect(mocks.verifyJournalIntegrity).toHaveBeenCalledWith(EST);
    expect(mocks.getClosureBulletins).toHaveBeenCalledWith(EST, 'DAILY');
    expect(mocks.getJournalStatsSummary).toHaveBeenCalledWith(EST);
    expect(res.body.compliance_status.journal_integrity).toBe('valide');
    expect(res.body.daily_closure_status).toBe('COMPLETED');
    expect(res.body.journal_statistics.total_entries).toBeDefined();
  });

  it('denies /compliance/status without access_compliance', async () => {
    const res = await withStaffPin(request(app).get('/compliance/status'), []);

    expect(res.status).toBe(403);
    expect(mocks.verifyJournalIntegrity).not.toHaveBeenCalled();
  });

  it('allows /compliance/status for establishment_admin without explicit permissions', async () => {
    mocks.verifyJournalIntegrity.mockResolvedValue({ isValid: true, errors: [] });
    mocks.getClosureBulletins.mockResolvedValue([]);

    const res = await withAdminPin(request(app).get('/compliance/status'));

    expect(res.status).toBe(200);
    expect(mocks.verifyJournalIntegrity).toHaveBeenCalledWith(EST);
  });

  it('allows /compliance/requirements with access_compliance', async () => {
    const res = await withStaffPin(request(app).get('/compliance/requirements'), ['access_compliance']);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.requirements)).toBe(true);
    expect(res.body.requirements.length).toBeGreaterThan(0);
  });

  it('denies /compliance/requirements without access_compliance', async () => {
    const res = await withStaffPin(request(app).get('/compliance/requirements'), []);

    expect(res.status).toBe(403);
  });

  it('denies /stats/monthly-live without access_closure or access_compliance', async () => {
    const res = await withStaffPin(request(app).get('/stats/monthly-live'), []);
    expect(res.status).toBe(403);
  });

  it('allows /stats/monthly-live with access_closure and returns monthly live metrics', async () => {
    mocks.getOrdersTotalsForPeriod.mockResolvedValue({
      total_ttc: 320.5,
      card_total: 200.25,
      cash_total: 120.25,
    });
    mocks.countDailyClosuresForPeriod.mockResolvedValue({ closure_count: 9 });

    const res = await withStaffPin(request(app).get('/stats/monthly-live'), ['access_closure']);

    expect(res.status).toBe(200);
    expect(mocks.getOrdersTotalsForPeriod).toHaveBeenCalled();
    expect(mocks.countDailyClosuresForPeriod).toHaveBeenCalled();
  });

  it('allows /stats/monthly-live with access_compliance and returns monthly live metrics', async () => {
    mocks.getOrdersTotalsForPeriod.mockResolvedValue({
      total_ttc: 320.5,
      card_total: 200.25,
      cash_total: 120.25,
    });
    mocks.countDailyClosuresForPeriod.mockResolvedValue({ closure_count: 9 });

    const res = await withStaffPin(request(app).get('/stats/monthly-live'), ['access_compliance']);

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
