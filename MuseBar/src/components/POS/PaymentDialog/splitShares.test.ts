import { describe, expect, it } from 'vitest';
import type { LocalSubBill, OrderItem } from '../../../types';
import {
  dialogResidualIndex,
  distributeCentsByWeights,
  resolveSplitShareCents,
  splitItemsAcrossBills,
  splitItemsByShareCents,
} from './splitShares';

function item(partial: Partial<OrderItem> & Pick<OrderItem, 'id' | 'totalPrice'>): OrderItem {
  return {
    productId: '1',
    productName: 'Item',
    quantity: 1,
    unitPrice: partial.totalPrice,
    taxRate: 0.2,
    taxAmount: 0.2,
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

describe('splitShares', () => {
  it('resolveSplitShareCents equal-splits when nothing typed', () => {
    expect(resolveSplitShareCents(100, [0, 1, 2], {})).toEqual({ 0: 34, 1: 33, 2: 33 });
    expect(resolveSplitShareCents(0, [0, 1], {})).toEqual({ 0: 0, 1: 0 });
    expect(resolveSplitShareCents(50, [], {})).toEqual({});
  });

  it('resolveSplitShareCents gives residual to last empty part', () => {
    expect(resolveSplitShareCents(100, [0, 1, 2], { 0: 0.4, 2: null })).toEqual({
      0: 40,
      1: 0,
      2: 60,
    });
    expect(resolveSplitShareCents(100, [0, 1, 2], { 0: 0.25 })).toEqual({ 0: 25, 1: 0, 2: 75 });
  });

  it('distributeCentsByWeights uses largest remainder', () => {
    expect(distributeCentsByWeights(10, [])).toEqual([]);
    expect(distributeCentsByWeights(10, [1, 1, 1])).toEqual([4, 3, 3]);
    expect(distributeCentsByWeights(0, [1, 2])).toEqual([0, 0]);
    expect(distributeCentsByWeights(5, [0, 0])).toEqual([0, 0]);
    const parts = distributeCentsByWeights(100, [1, 2]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('splitItemsByShareCents apportions item cents onto bills', () => {
    const bills = [bill({ id: '1' }), bill({ id: '2' })];
    const items = [item({ id: 'a', totalPrice: 10, taxAmount: 1 })];
    const next = splitItemsByShareCents(bills, items, { 0: 600, 1: 400 }, 10);
    expect(next[0]?.items[0]?.totalPrice).toBe(6);
    expect(next[1]?.items[0]?.totalPrice).toBe(4);
    expect(next[0]?.items[0]?.id).toBe('a::split::0');
    expect(splitItemsByShareCents(bills, [], { 0: 1 })).toBe(bills);
  });

  it('splitItemsAcrossBills equal-splits across selected indices', () => {
    const bills = [bill({ id: '1' }), bill({ id: '2' }), bill({ id: '3' })];
    const items = [item({ id: 'a', totalPrice: 1 })];
    const next = splitItemsAcrossBills(bills, items, [0, 2], 1);
    expect(next[0]?.items).toHaveLength(1);
    expect(next[1]?.items).toHaveLength(0);
    expect(next[2]?.items).toHaveLength(1);
    expect(next[0]!.items[0]!.totalPrice + next[2]!.items[0]!.totalPrice).toBeCloseTo(1, 10);
  });

  it('dialogResidualIndex tracks last free or last equal part', () => {
    expect(dialogResidualIndex([], {})).toBe(-1);
    expect(dialogResidualIndex([0, 2, 1], {})).toBe(2);
    expect(dialogResidualIndex([0, 1, 2], { 0: 1 })).toBe(2);
    expect(dialogResidualIndex([0, 1], { 0: 1, 1: 2 })).toBe(-1);
  });
});
