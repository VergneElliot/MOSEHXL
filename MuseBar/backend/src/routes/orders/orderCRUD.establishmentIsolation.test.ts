import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';

const EST_A = '11111111-1111-1111-1111-111111111111';
const EST_B = '22222222-2222-2222-2222-222222222222';
const EST_C = '33333333-3333-3333-3333-333333333333';

interface MockOrderRow {
  id: number;
  establishment_id: string;
  total_amount: number;
  total_tax: number;
  payment_method: 'cash' | 'card' | 'split';
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  tips?: number;
  change?: number;
}

const mocks = vi.hoisted(() => ({
  orders: [] as MockOrderRow[],
  getAll: vi.fn(),
  getItems: vi.fn(),
  getSubBills: vi.fn(),
  poolQuery: vi.fn(),
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

vi.mock('../../models', () => ({
  OrderModel: {
    getAll: mocks.getAll,
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  OrderItemModel: {
    getByOrderId: mocks.getItems,
    create: vi.fn(),
  },
  SubBillModel: {
    getByOrderId: mocks.getSubBills,
    create: vi.fn(),
  },
}));

vi.mock('../../models/legalJournal', () => ({
  __esModule: true,
  default: {
    logTransaction: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../models/auditTrail', () => ({
  AuditTrailModel: {
    logAction: vi.fn().mockResolvedValue({}),
  },
}));

import orderCRUDRouter from './orderCRUD';

const app = express();
app.use(express.json());
app.use('/orders', orderCRUDRouter);

function tokenFor(establishmentId: string) {
  return generateToken(
    {
      id: 42,
      email: 'tester@example.com',
      is_admin: false,
      role: 'establishment_admin',
      establishment_id: establishmentId,
    },
    false
  );
}

describe('GET /orders establishment isolation', () => {
  beforeEach(() => {
    mocks.orders = Array.from({ length: 100 }, (_, index) => {
      const establishmentId = index % 3 === 0 ? EST_A : index % 3 === 1 ? EST_B : EST_C;
      return {
        id: index + 1,
        establishment_id: establishmentId,
        total_amount: 10 + index,
        total_tax: 2 + index / 10,
        payment_method: 'card',
        status: 'completed',
        created_at: new Date(2026, 0, 1, 0, 0, index).toISOString(),
        tips: 0,
        change: 0,
      };
    });

    mocks.getAll.mockReset();
    mocks.getItems.mockReset();
    mocks.getSubBills.mockReset();
    mocks.poolQuery.mockReset();

    mocks.getAll.mockImplementation(async (establishmentId: string) =>
      mocks.orders.filter((order) => order.establishment_id === establishmentId)
    );
    mocks.getItems.mockResolvedValue([]);
    mocks.getSubBills.mockResolvedValue([]);
    mocks.poolQuery.mockResolvedValue({ rows: [{ total: 0 }] });
  });

  it('returns exactly the caller establishment orders from a 100-order 3-tenant dataset', async () => {
    const expectedForEstB = mocks.orders.filter((o) => o.establishment_id === EST_B);

    const res = await request(app)
      .get('/orders')
      .set('Authorization', `Bearer ${tokenFor(EST_B)}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(expectedForEstB.length);
    expect(res.body.every((o: { establishment_id?: string }) => o.establishment_id === EST_B)).toBe(true);
    expect(mocks.getAll).toHaveBeenCalledWith(EST_B, undefined);
  });
});
