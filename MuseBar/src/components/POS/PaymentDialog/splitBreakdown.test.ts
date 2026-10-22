import { describe, expect, it } from 'vitest';
import type { LocalSubBill, OrderItem } from '../../../types';
import { normalizeTaxRate, paymentMethodBreakdown, taxBreakdownByRate } from './splitBreakdown';

function item(partial: Partial<OrderItem> & Pick<OrderItem, 'id' | 'totalPrice'>): OrderItem {
  return {
    productId: '1',
    productName: 'Item',
    quantity: 1,
    unitPrice: partial.totalPrice,
    taxRate: 0.2,
    taxAmount: 0,
    isHappyHourApplied: false,
    ...partial,
  };
}

function bill(partial: Partial<LocalSubBill> & Pick<LocalSubBill, 'id'>): LocalSubBill {
  return {
    items: [],
    total: 0,
    payments: [{ amount: 0, method: 'card' }],
    tip: '0',
    manualAmount: null,
    ...partial,
  };
}

describe('splitBreakdown', () => {
  it('paymentMethodBreakdown sums cash vs card in cents', () => {
    expect(paymentMethodBreakdown([])).toEqual({ cash: 0, card: 0 });
    expect(
      paymentMethodBreakdown([
        bill({ id: '1', total: 1.105, payments: [{ amount: 1.105, method: 'cash' }] }),
        bill({ id: '2', total: 2.1, payments: [{ amount: 2.1, method: 'card' }] }),
        bill({ id: '3', total: 0.5, payments: [] }),
      ])
    ).toEqual({ cash: 1.11, card: 2.6 });
  });

  it('normalizeTaxRate accepts fraction or percent', () => {
    expect(normalizeTaxRate(0.1)).toBe(0.1);
    expect(normalizeTaxRate(10)).toBe(0.1);
    expect(normalizeTaxRate(20)).toBe(0.2);
    expect(normalizeTaxRate(-1)).toBe(0);
    expect(normalizeTaxRate(Number.NaN)).toBe(0);
  });

  it('taxBreakdownByRate buckets 10% / 20% / other and skips tips', () => {
    expect(taxBreakdownByRate([])).toEqual({ rate10: 0, rate20: 0, other: 0 });
    expect(
      taxBreakdownByRate([
        item({ id: 'a', totalPrice: 11, taxRate: 0.1, taxAmount: 1 }),
        item({ id: 'b', totalPrice: 12, taxRate: 20, taxAmount: 2 }),
        item({ id: 'c', totalPrice: 5, taxRate: 0.055, taxAmount: 0.25 }),
        item({ id: 'tip', totalPrice: 1, taxRate: 0, taxAmount: 0.5, isTip: true }),
      ])
    ).toEqual({ rate10: 1, rate20: 2, other: 0.25 });
  });
});
