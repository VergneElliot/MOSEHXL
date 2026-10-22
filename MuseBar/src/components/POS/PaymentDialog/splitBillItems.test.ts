import { describe, expect, it } from 'vitest';
import type { LocalSubBill, OrderItem } from '../../../types';
import { clearItemsFromBills, moveItemsToBill } from './splitBillItems';

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

describe('splitBillItems', () => {
  it('clearItemsFromBills removes all shares of source ids', () => {
    const bills = [
      bill({
        id: '1',
        items: [item({ id: 'a::split::0', totalPrice: 3 }), item({ id: 'b', totalPrice: 1 })],
      }),
      bill({ id: '2', items: [item({ id: 'a::split::1', totalPrice: 2 })] }),
    ];
    const next = clearItemsFromBills(bills, ['a']);
    expect(next[0]?.items.map((i) => i.id)).toEqual(['b']);
    expect(next[1]?.items).toEqual([]);
  });

  it('clearItemsFromBills recomputes when orderTotal given', () => {
    const bills = [
      bill({ id: '1', items: [item({ id: 'a', totalPrice: 4 })], manualAmount: null }),
      bill({ id: '2', items: [], manualAmount: null }),
    ];
    const next = clearItemsFromBills(bills, ['a'], 10);
    expect(next[0]?.total).toBe(0);
    expect(next[1]?.total).toBe(10);
  });

  it('moveItemsToBill relocates whole items onto target', () => {
    const bills = [
      bill({ id: '1', items: [item({ id: 'a', totalPrice: 5 })] }),
      bill({ id: '2', items: [] }),
    ];
    const next = moveItemsToBill(bills, [item({ id: 'a', totalPrice: 5 })], 1, 5);
    expect(next[0]?.items).toEqual([]);
    expect(next[1]?.items.map((i) => i.id)).toEqual(['a']);
    expect(next[1]?.total).toBe(5);
  });

  it('moveItemsToBill no-ops on bad index or empty items', () => {
    const bills = [bill({ id: '1' })];
    expect(moveItemsToBill(bills, [], 0)).toBe(bills);
    expect(moveItemsToBill(bills, [item({ id: 'a', totalPrice: 1 })], 3)).toBe(bills);
  });

  it('moveItemsToBill strips split suffix when merging', () => {
    const bills = [bill({ id: '1' }), bill({ id: '2' })];
    const next = moveItemsToBill(bills, [item({ id: 'a::split::9', totalPrice: 2 })], 0);
    expect(next[0]?.items[0]?.id).toBe('a');
  });
});
