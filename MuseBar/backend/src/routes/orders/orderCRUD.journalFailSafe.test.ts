import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';
import { errorHandler } from '../../middleware/errorHandler';

const EST = '11111111-1111-1111-1111-111111111111';

const mocks = vi.hoisted(() => ({
  orderCreate: vi.fn(),
  orderDelete: vi.fn(),
  itemCreate: vi.fn(),
  subBillCreate: vi.fn(),
  legalLogTransaction: vi.fn(),
  auditLogAction: vi.fn(),
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

vi.mock('../../middleware/orderPosLinePermissions', () => ({
  assertPosOrderLinePermissions: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

vi.mock('../../models', () => ({
  OrderModel: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: mocks.orderCreate,
    update: vi.fn(),
    delete: mocks.orderDelete,
  },
  OrderItemModel: {
    getByOrderId: vi.fn(),
    create: mocks.itemCreate,
  },
  SubBillModel: {
    getByOrderId: vi.fn(),
    create: mocks.subBillCreate,
  },
}));

vi.mock('../../models/legalJournal', () => ({
  __esModule: true,
  default: {
    logTransaction: mocks.legalLogTransaction,
  },
}));

vi.mock('../../models/auditTrail', () => ({
  AuditTrailModel: {
    logAction: mocks.auditLogAction,
  },
}));

import orderCRUDRouter from './orderCRUD';

const app = express();
app.use(express.json());
app.use('/orders', orderCRUDRouter);
app.use(errorHandler);

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

const createBody = {
  total_amount: 12,
  total_tax: 2,
  payment_method: 'card',
  status: 'completed',
  notes: '',
  items: [
    {
      product_name: 'Coffee',
      quantity: 1,
      unit_price: 10,
      total_price: 10,
      tax_rate: 0.2,
      tax_amount: 2,
      description: '',
    },
  ],
};

describe('POST /orders legal journal fail-safe', () => {
  beforeEach(() => {
    mocks.orderCreate.mockReset();
    mocks.orderDelete.mockReset();
    mocks.itemCreate.mockReset();
    mocks.subBillCreate.mockReset();
    mocks.legalLogTransaction.mockReset();
    mocks.auditLogAction.mockReset();
    mocks.poolQuery.mockReset();

    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    mocks.orderCreate.mockResolvedValue({
      id: 500,
      total_amount: 10,
      total_tax: 2,
      payment_method: 'card',
      status: 'completed',
      notes: '',
      tips: 0,
      change: 0,
      establishment_id: EST,
      created_at: new Date('2026-04-28T14:00:00.000Z'),
    });

    mocks.itemCreate.mockResolvedValue({
      id: 900,
      order_id: 500,
      product_name: 'Coffee',
      quantity: 1,
      unit_price: 10,
      total_price: 10,
      tax_rate: 0.2,
      tax_amount: 2,
      happy_hour_applied: false,
      happy_hour_discount_amount: 0,
      is_manual_happy_hour: false,
      description: '',
      establishment_id: EST,
      created_at: new Date('2026-04-28T14:00:00.000Z'),
    });
    mocks.orderDelete.mockResolvedValue(true);
    mocks.auditLogAction.mockResolvedValue({});
  });

  it('returns 500 and triggers compensating delete when SALE journal write fails', async () => {
    mocks.legalLogTransaction.mockRejectedValue(new Error('insert failed'));

    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${tokenFor(EST)}`)
      .send(createBody);

    expect(res.status).toBe(500);
    expect(String(res.body?.error?.message ?? '')).toContain('Failed to persist legal journal entry');
    expect(mocks.orderDelete).toHaveBeenCalledWith(500, EST);
    expect(mocks.auditLogAction).not.toHaveBeenCalled();
  });

  it('returns 201 for pending orders without requiring SALE journal write', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${tokenFor(EST)}`)
      .send({ ...createBody, status: 'pending' });

    expect(res.status).toBe(201);
    expect(mocks.legalLogTransaction).not.toHaveBeenCalled();
    expect(mocks.orderDelete).not.toHaveBeenCalled();
  });
});
