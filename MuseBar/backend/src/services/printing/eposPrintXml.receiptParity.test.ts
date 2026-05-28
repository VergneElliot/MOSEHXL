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

  it('includes invoice legal mentions when document kind is invoice', () => {
    const data: ReceiptData = {
      order_id: 3333,
      sequence_number: 12,
      document_kind: 'invoice',
      document_number: 'FAC-2026-000012',
      total_amount: 240,
      total_tax: 40,
      payment_method: 'transfer',
      created_at: '2026-05-28T10:00:00.000Z',
      receipt_type: 'summary',
      items: [],
      vat_breakdown: [{ rate: 20, subtotal_ht: 200, vat: 40 }],
      business_info: {
        name: 'Muse',
        address: '4 Impasse des Hauts Mariages',
        phone: '0102030405',
        email: 'hello@muse.test',
      },
      legal_info: {
        payment_due_date: '2026-06-30',
        payment_terms: 'Paiement à 30 jours',
        late_penalty_terms: 'Pénalités au taux BCE + 10 points',
        recovery_fee_note: 'Indemnité forfaitaire de recouvrement: 40 EUR (C. com. art. L441-10)',
        seller_legal_form: 'SARL',
        seller_share_capital_eur: 10000,
      },
      compliance_info: {
        invoice_hash: 'invoicehash123',
      },
    };

    const xml = receiptToEposPrintXml(data);
    expect(xml).toContain('Facture #FAC-2026-000012');
    expect(xml).toContain('Type: Facture sans detail');
    expect(xml).toContain('MENTIONS FACTURE');
    expect(xml).toContain('Echeance paiement: 2026-06-30');
    expect(xml).toContain('Conditions paiement: Paiement à 30 jours');
    expect(xml).toContain('Penalites retard: Pénalités au taux BCE + 10 points');
    expect(xml).toContain('Indemnité forfaitaire de recouvrement');
    expect(xml).toContain('Forme juridique: SARL');
    expect(xml).toContain('Capital social: 10000.00 EUR');
    expect(xml).toContain('Hash: invoicehash123');
    expect(xml).toContain('Facture securisee - Inalterable');
  });
});
