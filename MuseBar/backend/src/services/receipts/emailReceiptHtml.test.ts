import { describe, expect, it } from 'vitest';
import type { ReceiptData } from '../printing/types';
import { generateReceiptHTML } from './emailReceiptHtml';

const baseReceipt: ReceiptData = {
  order_id: 42,
  sequence_number: 7,
  total_amount: 24.5,
  total_tax: 2.5,
  payment_method: 'card',
  created_at: '2026-10-22T12:00:00.000Z',
  receipt_type: 'detailed',
  business_info: {
    name: 'Bar Test',
    address: '1 rue de la Paix',
    phone: '0102030405',
    email: 'bar@test.fr',
    siret: '12345678900012',
    tax_identification: 'FR123',
  },
  items: [
    { product_name: 'Café', quantity: 2, unit_price: 2.5, total_price: 5, tax_rate: 10 },
  ],
  vat_breakdown: [{ rate: 10, subtotal_ht: 22, vat: 2.5 }],
  tips: 1,
  change: 0,
  compliance_info: {
    receipt_hash: 'abcdef0123456789zzzz',
    cash_register_id: 'CR-1',
    operator_id: 'op-9',
  },
};

describe('generateReceiptHTML', () => {
  it('includes business header, order meta, items and totals', () => {
    const html = generateReceiptHTML(baseReceipt);
    expect(html).toContain('Bar Test');
    expect(html).toContain('SIRET: 12345678900012');
    expect(html).toContain('REÇU #7');
    expect(html).toContain('Commande:</strong> 42');
    expect(html).toContain('Carte');
    expect(html).toContain('Café');
    expect(html).toContain('Détail TVA');
    expect(html).toContain('Pourboire:');
    expect(html).toContain('TOTAL TTC:');
    expect(html).toContain('Article 286-I-3 bis du CGI');
    expect(html).toContain('Caisse: CR-1');
    expect(html).toContain('Hash: abcdef0123456789');
  });

  it('omits item rows for summary receipts', () => {
    const html = generateReceiptHTML({ ...baseReceipt, receipt_type: 'summary', tips: 0 });
    expect(html).not.toContain('<table class="items-table">');
    expect(html).not.toContain('Café');
    expect(html).not.toContain('Pourboire:');
  });
});
