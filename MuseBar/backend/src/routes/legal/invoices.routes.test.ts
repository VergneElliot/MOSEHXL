import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../middleware/errorHandler';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  poolConnect: vi.fn(),
  buildReceiptDataForOrder: vi.fn(),
}));

vi.mock('../../db/pool', () => ({
  pool: {
    query: mocks.poolQuery,
    connect: mocks.poolConnect,
  },
}));

vi.mock('../auth', () => ({
  requireAuth: (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    next();
  },
  requirePermission: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    next();
  },
  getEstablishmentId: () => 'est-1',
}));

vi.mock('../../permissions/registry', () => ({
  P: {
    access_pos: 'access_pos',
  },
}));

vi.mock('../../printing/printDataRepo', () => ({
  buildReceiptDataForOrder: mocks.buildReceiptDataForOrder,
}));

import invoicesRouter from './invoices';

const app = express();
app.use(express.json());
app.use('/invoices', (req, _res, next) => {
  (req as express.Request & { user?: unknown }).user = {
    id: 8,
    username: 'staff@example.com',
    establishment_id: 'est-1',
    role: 'staff',
  };
  next();
});
app.use('/invoices', invoicesRouter);
app.use(errorHandler);

describe('legal invoices routes', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.poolConnect.mockReset();
    mocks.buildReceiptDataForOrder.mockReset();
  });

  it('returns 400 for invalid order id', async () => {
    const res = await request(app)
      .post('/invoices/from-order/not-a-number')
      .send({
        customer: { name: 'Client A', address: '1 Rue de Paris' },
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.message).toBe('Invalid order id');
  });

  it('returns 400 when customer identity is incomplete', async () => {
    const res = await request(app)
      .post('/invoices/from-order/42')
      .send({
        customer: { name: '', address: '' },
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.message).toBe('Customer name is required');
    expect(mocks.buildReceiptDataForOrder).not.toHaveBeenCalled();
  });

  it('creates a dedicated invoice from an order with deterministic numbering', async () => {
    const invoiceYear = new Date().getFullYear();
    mocks.buildReceiptDataForOrder.mockResolvedValue({
      total_amount: 120,
      total_tax: 20,
      business_info: { name: 'MOSEHXL BAR' },
      items: [{ product_name: 'Menu midi', quantity: 1, unit_price: 100, total_price: 120, tax_rate: 20 }],
      vat_breakdown: [{ rate: 20, subtotal_ht: 100, vat: 20, total_ttc: 120 }],
      sequence_number: 99,
      compliance_info: { receipt_hash: 'abc123' },
    });

    const txQuery = vi.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.includes('SELECT id, invoice_number FROM legal_invoices')) return { rows: [], rowCount: 0 };
      if (sql.includes('SELECT next_sequence')) return { rows: [{ next_sequence: 12 }], rowCount: 1 };
      if (sql.includes('INSERT INTO legal_invoices')) {
        return {
          rows: [{ id: 501, invoice_number: `FAC-${invoiceYear}-000012`, order_id: 42, invoice_mode: 'detailed' }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });
    const txRelease = vi.fn();
    mocks.poolConnect.mockResolvedValue({ query: txQuery, release: txRelease });

    const res = await request(app)
      .post('/invoices/from-order/42')
      .send({
        mode: 'detailed',
        customer: {
          name: 'Client B2B',
          address: '12 Avenue de Lyon',
          email: 'facturation@client.fr',
          tax_identification: 'FRXX999999999',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.invoice.invoice_number).toBe(`FAC-${invoiceYear}-000012`);
    expect(mocks.buildReceiptDataForOrder).toHaveBeenCalledWith(
      expect.anything(),
      'est-1',
      expect.objectContaining({ establishment_id: 'est-1' }),
      42,
      'detailed'
    );
    expect(txRelease).toHaveBeenCalledTimes(1);
  });

  it('lists invoices with bounded pagination defaults', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, invoice_number: 'FAC-2026-000001' }],
      })
      .mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

    const res = await request(app).get('/invoices?limit=-1&offset=abc');

    expect(res.status).toBe(200);
    expect(res.body.invoices).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.limit).toBe(50);
    expect(res.body.offset).toBe(0);
  });
});
