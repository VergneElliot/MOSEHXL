import { describe, expect, it } from 'vitest';
import {
  buildFlux103Xml,
  formatFlux103Date,
  buildFlux103Filename,
} from './flux103Service';
import type { ClosureBulletinData } from '../printing/types';

const sampleBulletin: ClosureBulletinData = {
  id: 42,
  closure_type: 'DAILY',
  period_start: '2026-07-28T00:00:00.000Z',
  period_end: '2026-07-29T01:59:59.000Z',
  total_transactions: 17,
  fond_de_caisse: 150,
  total_amount: 330,
  total_vat: 40,
  vat_breakdown: {
    vat_10: { amount: 100, vat: 10, ttc: 110 },
    vat_20: { amount: 150, vat: 30, ttc: 180 },
  },
  payment_methods_breakdown: { card: 200, cash: 130 },
  first_sequence: 1,
  last_sequence: 17,
  closure_hash: 'abc',
  is_closed: true,
  closed_at: '2026-07-29T02:00:00.000Z',
  created_at: '2026-07-29T02:00:00.000Z',
  business_info: {
    name: 'Muse Bar',
    address: '1 rue Test',
    phone: '0102030405',
    email: 'contact@muse.fr',
    siret: '12345678900012',
    tax_identification: 'FR12345678900',
  },
};

describe('flux103Service', () => {
  it('formats AAAAMMJJ dates in UTC', () => {
    expect(formatFlux103Date('2026-07-28T00:00:00.000Z')).toBe('20260728');
  });

  it('builds Flux 10.3–shaped XML with TPS1 and VAT subtotals', () => {
    const xml = buildFlux103Xml(sampleBulletin);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<CategoryCode>TPS1</CategoryCode>');
    expect(xml).toContain('<TransactionsCurrency>EUR</TransactionsCurrency>');
    expect(xml).toContain('<TaxExclusiveAmount>250.00</TaxExclusiveAmount>');
    expect(xml).toContain('<TaxTotal>40.00</TaxTotal>');
    expect(xml).toContain('<TransactionsCount>17</TransactionsCount>');
    expect(xml).toContain('<TaxPercent>10</TaxPercent>');
    expect(xml).toContain('<TaxableAmount>100.00</TaxableAmount>');
    expect(xml).toContain('<TaxPercent>20</TaxPercent>');
    expect(xml).toContain('<Id schemeId="0002">123456789</Id>');
    expect(xml).toContain('<TypeCode>IN</TypeCode>');
    expect(buildFlux103Filename(sampleBulletin)).toBe('flux103-closure-42-20260728.xml');
  });

  it('allows TLB1 override', () => {
    const xml = buildFlux103Xml(sampleBulletin, { categoryCode: 'TLB1' });
    expect(xml).toContain('<CategoryCode>TLB1</CategoryCode>');
  });
});
