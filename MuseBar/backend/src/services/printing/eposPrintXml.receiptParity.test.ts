import { describe, expect, it } from 'vitest';
import { receiptToEposPrintXml } from './eposPrintXml';
import type { ReceiptData } from './types';

describe('receiptToEposPrintXml parity', () => {
  it('includes legal and fiscal parity markers', () => {
    const data: ReceiptData = {
      order_id: 2222,
      sequence_number: 345,
      total_amount: 111.5,
      total_tax: 15.17,
      payment_method: 'card',
      created_at: '2026-05-28T10:00:00.000Z',
      receipt_type: 'detailed',
      items: [
        {
          product_name: 'Americano',
          quantity: 1,
          unit_price: 5.5,
          total_price: 5.5,
          tax_rate: 10,
        },
      ],
      vat_breakdown: [
        { rate: 10, subtotal_ht: 40.91, vat: 4.09 },
        { rate: 20, subtotal_ht: 55.42, vat: 11.08 },
      ],
      tips: 0,
      change: 0,
      business_info: {
        name: 'Muse',
        address: '4 Impasse des Hauts Mariages',
        phone: '0102030405',
        email: 'hello@muse.test',
        siret: '9133471800018',
        tax_identification: 'FR6491334718',
      },
      compliance_info: {
        receipt_hash: 'abc123hash',
        cash_register_id: 'CR-est-1',
        operator_id: 'alice',
      },
    };

    const xml = receiptToEposPrintXml(data);

    expect(xml).toContain('SIRET: 9133471800018');
    expect(xml).toContain('TVA: FR6491334718');
    expect(xml).toContain('DETAIL TVA:');
    expect(xml).toContain('Base HT 10%');
    expect(xml).toContain('TVA 20%');
    expect(xml).toContain('Sous-total HT');
    expect(xml).toContain('TVA Totale');
    expect(xml).toContain('TOTAL TTC');
    expect(xml).toContain('Hash: abc123hash');
    expect(xml).toContain('Caisse: CR-est-1');
    expect(xml).toContain('Operateur: alice');
    expect(xml).toContain('Article 286-I-3 bis du CGI');
    expect(xml).toContain('Ticket securise - Inalterable');
  });
});
