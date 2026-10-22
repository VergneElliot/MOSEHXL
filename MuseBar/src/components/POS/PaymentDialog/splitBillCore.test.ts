import { describe, expect, it } from 'vitest';
import type { LocalSubBill, OrderItem } from '../../../types';
import {
  billMethod,
  billTotalFromItems,
  cents,
  fromCents,
  isBillAmountFixed,
  sourceItemId,
  syncBillItems,
  unassignedItems,
  withPayment,
} from './splitBillCore';

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

describe('splitBillCore', () => {
  it('cents / fromCents round-trip whole cents', () => {
    expect(cents(10.005)).toBe(1001);
    expect(cents(1.999)).toBe(200);
    expect(fromCents(123)).toBe(1.23);
  });

  it('sourceItemId strips ::split:: suffix', () => {
    expect(sourceItemId('abc::split::0')).toBe('abc');
    expect(sourceItemId('plain')).toBe('plain');
  });

  it('billTotalFromItems sums with cent rounding', () => {
    expect(billTotalFromItems([])).toBe(0);
    expect(billTotalFromItems([item({ id: 'a', totalPrice: 1.105 }), item({ id: 'b', totalPrice: 2.1 })])).toBe(
      3.21
    );
  });

  it('billMethod defaults to card when empty or non-cash', () => {
    expect(billMethod(bill({ id: '1', payments: [] }))).toBe('card');
    expect(billMethod(bill({ id: '1', payments: [{ amount: 5, method: 'card' }] }))).toBe('card');
    expect(billMethod(bill({ id: '1', payments: [{ amount: 5, method: 'cash' }] }))).toBe('cash');
  });

  it('withPayment keeps method and sets total/manual', () => {
    const base = bill({ id: '1', payments: [{ amount: 0, method: 'cash' }] });
    const next = withPayment(base, 12.5, 2);
    expect(next.total).toBe(12.5);
    expect(next.manualAmount).toBe(2);
    expect(next.payments).toEqual([{ amount: 12.5, method: 'cash' }]);
  });

  it('syncBillItems replaces items only', () => {
    const base = bill({ id: '1', total: 9, manualAmount: 1 });
    const items = [item({ id: 'x', totalPrice: 3 })];
    expect(syncBillItems(base, items)).toEqual({ ...base, items });
  });

  it('isBillAmountFixed requires finite manualAmount', () => {
    expect(isBillAmountFixed(bill({ id: '1', manualAmount: null }))).toBe(false);
    expect(isBillAmountFixed(bill({ id: '1', manualAmount: 0 }))).toBe(true);
    expect(isBillAmountFixed(bill({ id: '1', manualAmount: Number.NaN }))).toBe(false);
  });

  it('unassignedItems excludes sources already on any bill', () => {
    const order = [item({ id: 'a', totalPrice: 1 }), item({ id: 'b', totalPrice: 2 })];
    const bills = [bill({ id: '1', items: [item({ id: 'a::split::0', totalPrice: 1 })] })];
    expect(unassignedItems(order, bills).map((i) => i.id)).toEqual(['b']);
    expect(unassignedItems(order, [])).toEqual(order);
  });
});
