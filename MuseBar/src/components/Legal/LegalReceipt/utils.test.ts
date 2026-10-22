import { describe, expect, it } from 'vitest';
import {
  calculateReceiptTotals,
  getPaymentMethodDisplayName,
  getVatRate,
  printStyles,
  receiptFormatting,
} from './utils';

describe('LegalReceipt utils', () => {
  it('calculateReceiptTotals sums VAT and HT', () => {
    expect(
      calculateReceiptTotals(110, [{ tax_rate: 10, vat: 10, subtotal_ht: 100 }])
    ).toEqual({
      totalVAT: 10,
      sousTotalHT: 100,
      vatBreakdown: [{ tax_rate: 10, vat: 10, subtotal_ht: 100 }],
    });
    expect(calculateReceiptTotals('bad', null as unknown as [])).toEqual({
      totalVAT: 0,
      sousTotalHT: 0,
      vatBreakdown: [],
    });
  });

  it('getVatRate prefers tax_rate then rate', () => {
    expect(getVatRate({ tax_rate: 20, vat: 1, subtotal_ht: 1, rate: 5 })).toBe(20);
    expect(getVatRate({ tax_rate: NaN, vat: 1, subtotal_ht: 1, rate: 5.5 })).toBe(5.5);
    expect(getVatRate({ tax_rate: NaN, vat: 1, subtotal_ht: 1 })).toBe(0);
  });

  it('getPaymentMethodDisplayName maps known methods', () => {
    expect(getPaymentMethodDisplayName('card')).toBe('Carte Bancaire');
    expect(getPaymentMethodDisplayName('cash')).toBe('Espèces');
    expect(getPaymentMethodDisplayName('split')).toBe('Split');
    expect(getPaymentMethodDisplayName('cheque')).toBe('cheque');
  });

  it('exposes print styles and formatting helpers', () => {
    expect(printStyles).toContain('@media print');
    expect(typeof receiptFormatting.formatCurrency).toBe('function');
    expect(typeof receiptFormatting.formatDate).toBe('function');
  });
});
