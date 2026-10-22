import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { OrderItem } from '../../types';
import { saleLines, tipsFromOrder, usePOSOrderTotals } from '../usePOSOrderTotals';

function line(partial: Partial<OrderItem> & Pick<OrderItem, 'id'>): OrderItem {
  return {
    productId: '1',
    productName: 'Item',
    quantity: 1,
    unitPrice: 10,
    totalPrice: 10,
    taxRate: 0.2,
    taxAmount: 1.67,
    isHappyHourApplied: false,
    ...partial,
  };
}

describe('saleLines / tipsFromOrder', () => {
  it('excludes tip lines from sale lines', () => {
    const order = [
      line({ id: 'sale', unitPrice: 5, quantity: 2, taxAmount: 1 }),
      line({ id: 'tip', isTip: true, unitPrice: 3, quantity: 1, taxAmount: 0 }),
    ];
    expect(saleLines(order)).toHaveLength(1);
    expect(saleLines(order)[0]?.id).toBe('sale');
  });

  it('sums tip lines by unitPrice × quantity', () => {
    const order = [
      line({ id: 'sale', unitPrice: 10 }),
      line({ id: 't1', isTip: true, unitPrice: 2, quantity: 1 }),
      line({ id: 't2', isTip: true, unitPrice: 1.5, quantity: 2 }),
    ];
    expect(tipsFromOrder(order)).toBe(5);
  });
});

describe('usePOSOrderTotals', () => {
  it('computes totals and blocks payment on an empty cart', () => {
    const { result } = renderHook(() => usePOSOrderTotals([]));
    expect(result.current).toEqual({
      orderTotal: 0,
      orderTax: 0,
      orderSubtotal: 0,
      tipsTotal: 0,
      canProcessPayment: false,
    });
  });

  it('includes sale lines only in CA and keeps tips separate', () => {
    const order = [
      line({ id: 'a', unitPrice: 10, quantity: 2, taxAmount: 3.33 }),
      line({ id: 'tip', isTip: true, unitPrice: 4, quantity: 1, taxAmount: 0 }),
    ];
    const { result } = renderHook(() => usePOSOrderTotals(order));
    expect(result.current.orderSubtotal).toBe(20);
    expect(result.current.orderTotal).toBe(20);
    expect(result.current.orderTax).toBe(3.33);
    expect(result.current.tipsTotal).toBe(4);
    expect(result.current.canProcessPayment).toBe(true);
  });
});
