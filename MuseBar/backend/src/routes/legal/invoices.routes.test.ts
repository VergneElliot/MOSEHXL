import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../middleware/errorHandler';
import {
  DEFAULT_INVOICE_CUSTOMER_NAME,
  DEFAULT_PAYMENT_TERMS,
} from '../../services/orders/invoiceFieldDefaults';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  poolConnect: vi.fn(),
  buildReceiptDataForOrder: vi.fn(),
  buildReceiptDataForSubBill: vi.fn(),
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

vi.mock('../../printing/printDataSubBill', () => ({
  buildReceiptDataForSubBill: mocks.buildReceiptDataForSubBill,
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

const completeBusinessInfo = {
  name: 'MOSEHXL BAR',
  address: '10 Rue de la Paix, 75002 Paris',
  siret: '12345678900012',
  tax_identification: 'FR12345678901',
};

function mockCreateTransaction(invoiceYear: number) {
  const txQuery = vi.fn(async (sql: string) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
    if (sql.includes('SELECT next_sequence')) return { rows: [{ next_sequence: 12 }], rowCount: 1 };
    if (sql.includes('SELECT invoice_hash')) return { rows: [], rowCount: 0 };
    if (sql.includes('INSERT INTO legal_invoices')) {
      return {
        rows: [
          {
            id: 501,
            invoice_number: `FAC-${invoiceYear}-000012`,
            order_id: 42,
            invoice_mode: 'detailed',
            customer_name: DEFAULT_INVOICE_CUSTOMER_NAME,
            customer_address: '',
          },
        ],
        rowCount: 1,
      };
    }
    return { rows: [], rowCount: 0 };
  });
  const txRelease = vi.fn();
  mocks.poolConnect.mockResolvedValue({ query: txQuery, release: txRelease });
  return { txQuery, txRelease };
}

describe('legal invoices routes', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.poolConnect.mockReset();
    mocks.buildReceiptDataForOrder.mockReset();
    mocks.buildReceiptDataForSubBill.mockReset();
    mocks.poolQuery.mockResolvedValue({ rows: [], rowCount: 0 });
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

  it('creates invoice with default customer name when name is empty', async () => {
    const invoiceYear = new Date().getFullYear();
    mocks.buildReceiptDataForOrder.mockResolvedValue({
      total_amount: 120,
      total_tax: 20,
      business_info: completeBusinessInfo,
      items: [{ product_name: 'Menu midi', quantity: 1, unit_price: 100, total_price: 120, tax_rate: 20 }],
      vat_breakdown: [{ rate: 20, subtotal_ht: 100, vat: 20, total_ttc: 120 }],
      sequence_number: 99,
      compliance_info: { receipt_hash: 'abc123' },
    });
    const { txQuery, txRelease } = mockCreateTransaction(invoiceYear);

    const res = await request(app)
      .post('/invoices/from-order/42')
      .send({
        customer: { name: '', address: '' },
        legal: {
          payment_due_date: '2026-06-30',
          payment_terms: 'Paiement à 30 jours',
          late_penalty_terms: 'Pénalités au taux BCE + 10 points',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.already_exists).toBe(false);
    expect(mocks.buildReceiptDataForOrder).toHaveBeenCalled();
    const insertCall = txQuery.mock.calls.find((c) => String(c[0]).includes('INSERT INTO legal_invoices'));
    expect(insertCall?.[1]?.[8]).toBe(DEFAULT_INVOICE_CUSTOMER_NAME);
    expect(txRelease).toHaveBeenCalledTimes(1);
  });

  it('creates invoice when customer address is omitted', async () => {
    const invoiceYear = new Date().getFullYear();
    mocks.buildReceiptDataForOrder.mockResolvedValue({
      total_amount: 60,
      total_tax: 10,
      business_info: completeBusinessInfo,
      items: [],
      vat_breakdown: [],
      sequence_number: 15,
      compliance_info: { receipt_hash: 'hash-15' },
    });
    const { txQuery, txRelease } = mockCreateTransaction(invoiceYear);

    const res = await request(app)
      .post('/invoices/from-order/42')
      .send({
        customer: { name: 'Client Particulier' },
        legal: {
          payment_due_date: '2026-06-30',
          payment_terms: 'Paiement comptant',
          late_penalty_terms: 'Pénalités légales',
        },
      });

    expect(res.status).toBe(201);
    const insertCall = txQuery.mock.calls.find((c) => String(c[0]).includes('INSERT INTO legal_invoices'));
    expect(insertCall?.[1]?.[8]).toBe('Client Particulier');
    expect(insertCall?.[1]?.[9]).toBe('');
    expect(txRelease).toHaveBeenCalledTimes(1);
  });

  it('creates a dedicated invoice from an order with deterministic numbering', async () => {
    const invoiceYear = new Date().getFullYear();
    mocks.buildReceiptDataForOrder.mockResolvedValue({
      total_amount: 120,
      total_tax: 20,
      business_info: completeBusinessInfo,
      items: [{ product_name: 'Menu midi', quantity: 1, unit_price: 100, total_price: 120, tax_rate: 20 }],
      vat_breakdown: [{ rate: 20, subtotal_ht: 100, vat: 20, total_ttc: 120 }],
      sequence_number: 99,
      compliance_info: { receipt_hash: 'abc123' },
    });

    const { txRelease } = mockCreateTransaction(invoiceYear);

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
        legal: {
          payment_due_date: '2026-06-30',
          payment_terms: 'Paiement à 30 jours',
          late_penalty_terms: 'Pénalités au taux BCE + 10 points',
          recovery_fee_note: 'Indemnité forfaitaire de recouvrement: 40 EUR (C. com. art. L441-10)',
          seller_legal_form: 'SARL',
          seller_share_capital_eur: 10000,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.invoice.invoice_number).toBe(`FAC-${invoiceYear}-000012`);
    expect(res.body.already_exists).toBe(false);
    expect(mocks.buildReceiptDataForOrder).toHaveBeenCalledWith(
      expect.anything(),
      'est-1',
      expect.objectContaining({ establishment_id: 'est-1' }),
      42,
      'detailed'
    );
    expect(txRelease).toHaveBeenCalledTimes(1);
  });

  it('creates invoice for a split payment part via sub_bill_id', async () => {
    const invoiceYear = new Date().getFullYear();
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // existing invoice lookup
      .mockResolvedValueOnce({ rows: [{ id: 77 }], rowCount: 1 }); // sub_bill belongs to order
    mocks.buildReceiptDataForSubBill.mockResolvedValue({
      total_amount: 40,
      total_tax: 6.67,
      business_info: completeBusinessInfo,
      items: [{ product_name: 'Paiement 1/2 — Carte', quantity: 1, unit_price: 40, total_price: 40, tax_rate: 20 }],
      vat_breakdown: [{ rate: 20, subtotal_ht: 33.33, vat: 6.67 }],
      sequence_number: 99,
      compliance_info: { receipt_hash: 'abc123' },
      sub_bill_id: 77,
      sub_bill_index: 1,
      sub_bill_count: 2,
    });
    const { txQuery, txRelease } = mockCreateTransaction(invoiceYear);

    const res = await request(app)
      .post('/invoices/from-order/42')
      .send({
        sub_bill_id: 77,
        customer: { name: 'Client Split' },
        legal: {
          payment_due_date: '2026-06-30',
          payment_terms: 'Comptant',
          late_penalty_terms: 'Pénalités légales',
        },
      });

    expect(res.status).toBe(201);
    expect(mocks.buildReceiptDataForSubBill).toHaveBeenCalledWith(
      expect.anything(),
      'est-1',
      expect.objectContaining({ establishment_id: 'est-1' }),
      42,
      77,
      'detailed'
    );
    expect(mocks.buildReceiptDataForOrder).not.toHaveBeenCalled();
    const insertCall = txQuery.mock.calls.find((c) => String(c[0]).includes('INSERT INTO legal_invoices'));
    expect(insertCall?.[1]?.[2]).toBe(77);
    expect(txRelease).toHaveBeenCalledTimes(1);
  });

  it('returns existing invoice for same order and sub_bill_id without generating a new sequence', async () => {
    mocks.poolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 88,
          invoice_number: 'FAC-2026-000088',
          order_id: 42,
          sub_bill_id: null,
          invoice_mode: 'detailed',
          payment_due_date: '2026-06-30',
          payment_terms: 'Paiement comptant',
          late_penalty_terms: 'Pénalités légales',
          recovery_fee_note: 'Indemnité forfaitaire de recouvrement: 40 EUR (C. com. art. L441-10)',
          business_info: completeBusinessInfo,
        },
      ],
      rowCount: 1,
    });

    const res = await request(app)
      .post('/invoices/from-order/42')
      .send({
        mode: 'summary',
        customer: {
          name: 'Client déjà facturé',
          address: '3 Rue Victor Hugo',
        },
        legal: {
          payment_due_date: '2026-06-30',
          payment_terms: 'Paiement comptant',
          late_penalty_terms: 'Pénalités légales',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.already_exists).toBe(true);
    expect(res.body.invoice.invoice_number).toBe('FAC-2026-000088');
    expect(res.body.invoice.requested_mode).toBe('summary');
    expect(mocks.poolConnect).not.toHaveBeenCalled();
    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('sub_bill_id'),
      ['est-1', 42, null]
    );
  });

  it('blocks existing invoice export when persisted legal fields are incomplete', async () => {
    mocks.poolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 90,
          invoice_number: 'FAC-2026-000090',
          order_id: 42,
          invoice_mode: 'detailed',
          payment_due_date: null,
          payment_terms: '',
          late_penalty_terms: '',
          recovery_fee_note: '',
          business_info: {
            name: 'Muse',
            address: '4 Rue',
            siret: '123',
            tax_identification: 'FR123',
          },
        },
      ],
      rowCount: 1,
    });

    const res = await request(app)
      .post('/invoices/from-order/42')
      .send({
        mode: 'summary',
        customer: {
          name: 'Client',
          address: '3 Rue Victor Hugo',
        },
        legal: {
          payment_due_date: '2026-06-30',
          payment_terms: 'Paiement comptant',
          late_penalty_terms: 'Pénalités légales',
        },
      });

    expect(res.status).toBe(400);
    expect(String(res.body.error?.message ?? '')).toContain('Invoice compliance blocked');
    expect(mocks.poolConnect).not.toHaveBeenCalled();
  });

  it('blocks invoice creation when seller legal identity is missing in settings snapshot', async () => {
    mocks.buildReceiptDataForOrder.mockResolvedValue({
      total_amount: 120,
      total_tax: 20,
      business_info: { name: 'MOSEHXL BAR', address: '', siret: '', tax_identification: '' },
      items: [],
      vat_breakdown: [],
      sequence_number: 99,
      compliance_info: { receipt_hash: 'abc123' },
    });

    const res = await request(app)
      .post('/invoices/from-order/42')
      .send({
        mode: 'detailed',
        customer: {
          name: 'Client B2B',
          address: '12 Avenue de Lyon',
        },
        legal: {
          payment_due_date: '2026-06-30',
          payment_terms: 'Paiement à 30 jours',
          late_penalty_terms: 'Pénalités au taux BCE + 10 points',
        },
      });

    expect(res.status).toBe(400);
    expect(String(res.body.error?.message ?? '')).toContain('missing seller identity fields');
  });

  it('applies default legal terms when legal body fields are omitted', async () => {
    const invoiceYear = new Date().getFullYear();
    mocks.buildReceiptDataForOrder.mockResolvedValue({
      total_amount: 120,
      total_tax: 20,
      business_info: completeBusinessInfo,
      items: [],
      vat_breakdown: [],
      sequence_number: 99,
      compliance_info: { receipt_hash: 'abc123' },
    });
    const { txQuery, txRelease } = mockCreateTransaction(invoiceYear);

    const res = await request(app)
      .post('/invoices/from-order/42')
      .send({
        mode: 'detailed',
        customer: { name: 'Client B2B', address: '12 Avenue de Lyon' },
        legal: {},
      });

    expect(res.status).toBe(201);
    const insertCall = txQuery.mock.calls.find((c) => String(c[0]).includes('INSERT INTO legal_invoices'));
    expect(insertCall?.[1]?.[13]).toBe(DEFAULT_PAYMENT_TERMS);
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
