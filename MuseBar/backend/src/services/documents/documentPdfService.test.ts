import { describe, expect, it } from 'vitest';
import {
  renderClosureBulletinPdf,
  renderInvoicePdf,
  renderReceiptPdf,
} from './documentPdfService';
import type { ClosureBulletinData, ReceiptData } from '../printing/types';

const baseReceipt: ReceiptData = {
  order_id: 42,
  sequence_number: 7,
  document_kind: 'ticket',
  document_number: '000007',
  total_amount: 12.5,
  total_tax: 2.08,
  payment_method: 'card',
  created_at: '2026-06-11T10:00:00.000Z',
  items: [
    {
      product_name: 'Café',
      quantity: 1,
      unit_price: 12.5,
      total_price: 12.5,
      tax_rate: 20,
    },
  ],
  business_info: {
    name: 'Café Test',
    address: '1 rue Test',
    phone: '0102030405',
    email: 'cafe@test.fr',
    siret: '12345678901234',
    tax_identification: 'FR12345678901',
  },
  vat_breakdown: [{ rate: 20, subtotal_ht: 10.42, vat: 2.08 }],
  receipt_type: 'detailed',
  compliance_info: {
    receipt_hash: 'abc123def456',
    cash_register_id: 'CR-est-1',
    operator_id: 'alice',
  },
};

const baseInvoice: ReceiptData = {
  ...baseReceipt,
  document_kind: 'invoice',
  document_number: 'FAC-2026-000001',
  customer_info: {
    name: 'Client SA',
    address: '2 avenue Client',
    email: 'client@exemple.com',
    tax_identification: 'FR99887766554',
  },
  legal_info: {
    payment_due_date: '2026-07-11',
    payment_terms: 'Paiement à 30 jours',
    late_penalty_terms: 'Pénalités de retard exigibles',
    recovery_fee_note: 'Indemnité forfaitaire de recouvrement: 40 EUR',
  },
  compliance_info: {
    invoice_hash: 'invoicehash123456',
    cash_register_id: 'CR-est-1',
    operator_id: 'alice',
  },
};

const baseBulletin: ClosureBulletinData = {
  id: 9,
  closure_type: 'MONTHLY',
  period_start: '2026-05-01T00:00:00.000Z',
  period_end: '2026-05-31T23:59:59.000Z',
  total_transactions: 120,
  fond_de_caisse: 100,
  total_amount: 5000,
  total_vat: 833.33,
  vat_breakdown: {
    vat_10: { amount: 1000, vat: 90.91, ttc: 1090.91 },
    vat_20: { amount: 3000, vat: 500, ttc: 3500 },
  },
  payment_methods_breakdown: { card: 4000, cash: 1000 },
  first_sequence: 1,
  last_sequence: 120,
  closure_hash: 'closurehash123456789',
  is_closed: true,
  closed_at: '2026-06-01T01:00:00.000Z',
  created_at: '2026-06-01T01:00:00.000Z',
  business_info: baseReceipt.business_info,
};

describe('documentPdfService', () => {
  it('renders receipt PDF buffer with PDF header', async () => {
    const pdf = await renderReceiptPdf(baseReceipt);
    expect(pdf.length).toBeGreaterThan(100);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('renders invoice PDF buffer with PDF header', async () => {
    const pdf = await renderInvoicePdf(baseInvoice);
    expect(pdf.length).toBeGreaterThan(100);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('renders closure bulletin PDF buffer', async () => {
    const pdf = await renderClosureBulletinPdf(baseBulletin);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });
});
