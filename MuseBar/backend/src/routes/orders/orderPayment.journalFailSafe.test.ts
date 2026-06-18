import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateToken } from '../auth';
import { errorHandler } from '../../middleware/errorHandler';

const EST = '11111111-1111-1111-1111-111111111111';

const mocks = vi.hoisted(() => ({
  orderGetById: vi.fn(),
  orderCreate: vi.fn(),
  orderDelete: vi.fn(),
  orderItemGetByOrderId: vi.fn(),
  orderItemCreate: vi.fn(),
  subBillGetByOrderId: vi.fn(),
  subBillCreate: vi.fn(),
  legalLogChange: vi.fn(),
  legalAddEntry: vi.fn(),
  auditLogAction: vi.fn(),
  poolQuery: vi.fn(),
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

vi.mock('../../models', () => ({
  OrderModel: {
    getAll: vi.fn(),
    getById: mocks.orderGetById,
    create: mocks.orderCreate,
    update: vi.fn(),
    delete: mocks.orderDelete,
  },
  OrderItemModel: {
    getByOrderId: mocks.orderItemGetByOrderId,
    create: mocks.orderItemCreate,
  },
  SubBillModel: {
    getByOrderId: mocks.subBillGetByOrderId,
    create: mocks.subBillCreate,
  },
}));

vi.mock('../../models/legalJournal', () => ({
  __esModule: true,
  default: {
    logChange: mocks.legalLogChange,
    addEntry: mocks.legalAddEntry,
  },
}));

vi.mock('../../models/auditTrail', () => ({
  AuditTrailModel: {
    logAction: mocks.auditLogAction,
  },
}));

import orderPaymentRouter from './orderPayment';

const app = express();
app.use(express.json());
app.use('/orders/payment', orderPaymentRouter);
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

describe('POST /orders/payment legal journal fail-safe parity', () => {
  beforeEach(() => {
    mocks.orderGetById.mockReset();
    mocks.orderCreate.mockReset();
    mocks.orderDelete.mockReset();
    mocks.orderItemGetByOrderId.mockReset();
    mocks.orderItemCreate.mockReset();
    mocks.subBillGetByOrderId.mockReset();
    mocks.subBillCreate.mockReset();
    mocks.legalLogChange.mockReset();
    mocks.legalAddEntry.mockReset();
    mocks.auditLogAction.mockReset();
    mocks.poolQuery.mockReset();

    mocks.poolQuery.mockImplementation(async (query: unknown) => {
      const sql = String(query ?? '');
      if (sql.includes('FROM token_blocklist')) {
        return { rows: [] };
      }
      if (sql.includes('SELECT role FROM users')) {
        return { rows: [{ role: 'establishment_admin' }] };
      }
      if (sql.includes('SELECT name FROM permissions')) {
        return {
          rows: [{ name: 'access_pos' }, { name: 'orders_cancel' }],
        };
      }
      return { rows: [] };
    });

    mocks.orderDelete.mockResolvedValue(true);
    mocks.orderItemGetByOrderId.mockResolvedValue([]);
    mocks.subBillGetByOrderId.mockResolvedValue([]);
    mocks.orderItemCreate.mockResolvedValue({});
    mocks.subBillCreate.mockResolvedValue({});
    mocks.legalLogChange.mockResolvedValue({});
    mocks.legalAddEntry.mockResolvedValue({});
    mocks.auditLogAction.mockResolvedValue({});
  });

  it('returns 500 and compensating delete when change journal write fails', async () => {
    mocks.orderCreate.mockResolvedValue({
      id: 700,
      total_amount: 0,
      total_tax: 0,
      payment_method: 'card',
      status: 'completed',
      notes: 'Faire de la Monnaie: 10€ - Carte vers Espèces',
      tips: 0,
      change: 10,
      operation_type: 'change',
      change_amount: 10,
      establishment_id: EST,
      created_at: new Date('2026-04-29T18:00:00.000Z'),
    });
    mocks.legalLogChange.mockRejectedValue(new Error('journal fail'));

    const res = await request(app)
      .post('/orders/payment/change')
      .set('Authorization', `Bearer ${tokenFor(EST)}`)
      .send({ amount: 10 });

    expect(res.status).toBe(500);
    expect(String(res.body?.error?.message ?? '')).toContain(
      'Failed to persist legal journal entry for cash register change'
    );
    expect(mocks.orderDelete).toHaveBeenCalledWith(700, EST);
    expect(mocks.auditLogAction).not.toHaveBeenCalled();
  });

  it('returns 500 and compensating delete when change-cancellation journal write fails', async () => {
    mocks.orderGetById.mockResolvedValue({
      id: 10,
      total_amount: 0,
      total_tax: 0,
      payment_method: 'card',
      status: 'completed',
      notes: 'Faire de la Monnaie: 12€ - Carte vers Espèces',
      tips: 0,
      change: 12,
      change_amount: 12,
      operation_type: 'change',
      establishment_id: EST,
    });
    mocks.orderCreate.mockResolvedValue({
      id: 701,
      total_amount: 0,
      total_tax: 0,
      payment_method: 'card',
      status: 'completed',
      notes: 'ANNULATION FAIRE DE LA MONNAIE',
      tips: 0,
      change: -12,
      operation_type: 'change',
      change_amount: -12,
      establishment_id: EST,
      created_at: new Date('2026-04-29T18:10:00.000Z'),
    });
    mocks.legalLogChange.mockRejectedValue(new Error('journal fail'));

    const res = await request(app)
      .post('/orders/payment/cancel-unified')
      .set('Authorization', `Bearer ${tokenFor(EST)}`)
      .send({ orderId: 10, reason: 'mistake' });

    expect(res.status).toBe(500);
    expect(String(res.body?.error?.message ?? '')).toContain(
      'Failed to persist legal journal entry for change cancellation'
    );
    expect(mocks.orderDelete).toHaveBeenCalledWith(701, EST);
    expect(mocks.auditLogAction).not.toHaveBeenCalled();
  });

  it('returns 500 and compensating delete when REFUND journal write fails', async () => {
    mocks.orderGetById.mockResolvedValue({
      id: 11,
      total_amount: 40,
      total_tax: 8,
      payment_method: 'card',
      status: 'completed',
      notes: 'Normal order',
      tips: 0,
      establishment_id: EST,
    });
    mocks.orderItemGetByOrderId.mockResolvedValue([
      {
        id: 1,
        order_id: 11,
        product_id: 5,
        product_name: 'Coffee',
        quantity: 2,
        unit_price: 20,
        total_price: 40,
        tax_rate: 0.2,
        tax_amount: 8,
        happy_hour_applied: false,
        happy_hour_discount_amount: 0,
        is_manual_happy_hour: false,
      },
    ]);
    mocks.orderCreate.mockResolvedValue({
      id: 702,
      total_amount: -40,
      total_tax: -8,
      payment_method: 'card',
      status: 'completed',
      notes: 'ANNULATION',
      establishment_id: EST,
      created_at: new Date('2026-04-29T18:20:00.000Z'),
    });
    mocks.legalAddEntry.mockRejectedValue(new Error('refund journal fail'));

    const res = await request(app)
      .post('/orders/payment/cancel-unified')
      .set('Authorization', `Bearer ${tokenFor(EST)}`)
      .send({ orderId: 11, reason: 'customer request', cancellationType: 'full' });

    expect(res.status).toBe(500);
    expect(String(res.body?.error?.message ?? '')).toContain(
      'Failed to persist legal journal entry for order cancellation'
    );
    expect(mocks.orderDelete).toHaveBeenCalledWith(702, EST);
    expect(mocks.auditLogAction).not.toHaveBeenCalled();
  });

  it('returns 500 and cleans up both created orders when tip-reversal journal write fails', async () => {
    mocks.orderGetById.mockResolvedValue({
      id: 12,
      total_amount: 40,
      total_tax: 8,
      payment_method: 'card',
      status: 'completed',
      notes: 'Normal order',
      tips: 5,
      establishment_id: EST,
    });
    mocks.orderItemGetByOrderId.mockResolvedValue([
      {
        id: 2,
        order_id: 12,
        product_id: 8,
        product_name: 'Meal',
        quantity: 1,
        unit_price: 40,
        total_price: 40,
        tax_rate: 0.2,
        tax_amount: 8,
        happy_hour_applied: false,
        happy_hour_discount_amount: 0,
        is_manual_happy_hour: false,
      },
    ]);
    mocks.orderCreate
      .mockResolvedValueOnce({
        id: 703,
        total_amount: -40,
        total_tax: -8,
        payment_method: 'card',
        status: 'completed',
        notes: 'ANNULATION',
        establishment_id: EST,
        created_at: new Date('2026-04-29T18:30:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 704,
        total_amount: 0,
        total_tax: 0,
        payment_method: 'card',
        status: 'completed',
        notes: 'ANNULATION POURBOIRE',
        tips: 0,
        change: -5,
        operation_type: 'change',
        change_amount: -5,
        establishment_id: EST,
        created_at: new Date('2026-04-29T18:31:00.000Z'),
      });
    mocks.legalLogChange.mockRejectedValue(new Error('tip journal fail'));

    const res = await request(app)
      .post('/orders/payment/cancel-unified')
      .set('Authorization', `Bearer ${tokenFor(EST)}`)
      .send({
        orderId: 12,
        reason: 'tip correction',
        cancellationType: 'full',
        includeTipReversal: true,
      });

    expect(res.status).toBe(500);
    expect(String(res.body?.error?.message ?? '')).toContain(
      'Failed to persist legal journal entry for tip reversal'
    );
    expect(mocks.orderDelete).toHaveBeenNthCalledWith(1, 704, EST);
    expect(mocks.orderDelete).toHaveBeenNthCalledWith(2, 703, EST);
    expect(mocks.legalAddEntry).not.toHaveBeenCalled();
    expect(mocks.auditLogAction).not.toHaveBeenCalled();
  });
});
