import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';

const EST = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  getUserPermissions: vi.fn(),
  getOrdersAndSubBillsForPeriod: vi.fn(),
  getTopProductsForOrders: vi.fn(),
  getCurrentBusinessDayPeriod: vi.fn(),
  computePaymentBreakdownFromOrders: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  __esModule: true,
  default: express(),
  pool: {
    query: mocks.poolQuery,
  },
}));

vi.mock('../../models/user', () => ({
  UserModel: {
    getUserPermissions: mocks.getUserPermissions,
  },
}));

vi.mock('../../models/legalJournal/businessDayStatsRepository', () => ({
  BusinessDayStatsRepository: {
    getOrdersAndSubBillsForPeriod: mocks.getOrdersAndSubBillsForPeriod,
    getTopProductsForOrders: mocks.getTopProductsForOrders,
  },
}));

vi.mock('../../models/legalJournal/businessDayPeriod', () => ({
  getCurrentBusinessDayPeriod: mocks.getCurrentBusinessDayPeriod,
}));

vi.mock('../../models/legalJournal/paymentBreakdown', () => ({
  computePaymentBreakdownFromOrders: mocks.computePaymentBreakdownFromOrders,
}));

vi.mock('../../permissions/registry', () => ({
  P: {
    access_compliance: 'access_compliance',
    access_pos: 'access_pos',
  },
}));

import businessDayStatsRouter from './businessDayStats';

const app = express();
app.use(express.json());
app.use('/legal', businessDayStatsRouter);

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

describe('legal business-day-stats permission gate', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.getUserPermissions.mockReset();
    mocks.getOrdersAndSubBillsForPeriod.mockReset();
    mocks.getTopProductsForOrders.mockReset();
    mocks.getCurrentBusinessDayPeriod.mockReset();
    mocks.computePaymentBreakdownFromOrders.mockReset();

    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const start = new Date('2026-04-30T00:00:00.000Z');
    const end = new Date('2026-04-30T23:59:59.999Z');
    mocks.getCurrentBusinessDayPeriod.mockReturnValue({
      start: { toDate: () => start, toISOString: () => start.toISOString() },
      end: { toDate: () => end, toISOString: () => end.toISOString() },
    });
    mocks.getOrdersAndSubBillsForPeriod.mockResolvedValue({ orders: [], subBills: [] });
    mocks.computePaymentBreakdownFromOrders.mockReturnValue({ paymentBreakdown: {} });
    mocks.getTopProductsForOrders.mockResolvedValue([]);
  });

  it('denies access without access_compliance or access_pos', async () => {
    mocks.getUserPermissions.mockResolvedValue([]);

    const res = await request(app)
      .get('/legal/business-day-stats')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(403);
    expect(mocks.getOrdersAndSubBillsForPeriod).not.toHaveBeenCalled();
  });

  it('allows access with access_compliance', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_compliance']);

    const res = await request(app)
      .get('/legal/business-day-stats')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(200);
    expect(mocks.getOrdersAndSubBillsForPeriod).toHaveBeenCalled();
  });

  it('allows access with access_pos', async () => {
    mocks.getUserPermissions.mockResolvedValue(['access_pos']);

    const res = await request(app)
      .get('/legal/business-day-stats')
      .set('Authorization', `Bearer ${tokenFor('staff')}`);

    expect(res.status).toBe(200);
    expect(mocks.getOrdersAndSubBillsForPeriod).toHaveBeenCalled();
  });
});
