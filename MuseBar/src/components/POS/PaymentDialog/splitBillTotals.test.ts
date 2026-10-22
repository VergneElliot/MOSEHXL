import { describe, expect, it } from 'vitest';
import type { LocalSubBill, OrderItem } from '../../../types';
import {
  billManualDisplay,
  createEmptyBills,
  equalAmountBills,
  recomputeBillTotals,
  residualBillIndex,
  setBillManualAmount,
} from './splitBillTotals';

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

describe('splitBillTotals', () => {
  it('residualBillIndex picks last unfixed bill', () => {
    expect(residualBillIndex([])).toBe(-1);
    expect(
      residualBillIndex([
        bill({ id: '1', manualAmount: 5 }),
        bill({ id: '2', manualAmount: null }),
        bill({ id: '3', manualAmount: null }),
      ])
    ).toBe(2);
    expect(residualBillIndex([bill({ id: '1', manualAmount: 1 }), bill({ id: '2', manualAmount: 2 })])).toBe(
      -1
    );
  });

  it('recomputeBillTotals assigns residual so parts sum to orderTotal', () => {
    const bills = [
      bill({ id: '1', items: [item({ id: 'a', totalPrice: 3 })], manualAmount: null }),
      bill({ id: '2', items: [], manualAmount: null }),
    ];
    const next = recomputeBillTotals(bills, 10);
    expect(next[0]?.total).toBe(3);
    expect(next[1]?.total).toBe(7);
    expect(next.reduce((s, b) => s + b.total, 0)).toBe(10);
  });

  it('recomputeBillTotals respects typed manual top-up', () => {
    const bills = [
      bill({ id: '1', items: [item({ id: 'a', totalPrice: 2 })], manualAmount: 1 }),
      bill({ id: '2', items: [], manualAmount: null }),
    ];
    const next = recomputeBillTotals(bills, 10);
    expect(next[0]?.total).toBe(3);
    expect(next[1]?.total).toBe(7);
  });

  it('recomputeBillTotals returns empty unchanged', () => {
    expect(recomputeBillTotals([], 10)).toEqual([]);
  });

  it('billManualDisplay shows residual top-up or typed amount', () => {
    const residual = bill({ id: '1', items: [item({ id: 'a', totalPrice: 2 })], total: 5 });
    expect(billManualDisplay(residual, true)).toBe(3);
    expect(billManualDisplay(bill({ id: '2', manualAmount: 1.5, total: 1.5 }), false)).toBe(1.5);
    expect(billManualDisplay(bill({ id: '3', manualAmount: null, total: 0 }), false)).toBe(0);
  });

  it('createEmptyBills preserves prior methods and ids', () => {
    const existing = [bill({ id: 'keep', payments: [{ amount: 0, method: 'cash' }] })];
    const next = createEmptyBills(2, existing);
    expect(next).toHaveLength(2);
    expect(next[0]?.id).toBe('keep');
    expect(next[0]?.payments[0]?.method).toBe('cash');
    expect(next[1]?.id).toBe('split-2');
    expect(createEmptyBills(0)).toHaveLength(1);
  });

  it('setBillManualAmount parses comma decimals and clears on empty', () => {
    const bills = [bill({ id: '1' }), bill({ id: '2' })];
    const withManual = setBillManualAmount(bills, 0, '1,50', 10);
    expect(withManual[0]?.manualAmount).toBe(1.5);
    const cleared = setBillManualAmount(withManual, 0, '  ', 10);
    expect(cleared[0]?.manualAmount).toBeNull();
    expect(setBillManualAmount(bills, 0, '-1', 10)).toBe(bills);
    expect(setBillManualAmount(bills, 9, '1', 10)).toBe(bills);
  });

  it('equalAmountBills splits cents with remainder on first parts', () => {
    const parts = equalAmountBills(3, 10.01);
    expect(parts.map((p) => p.total)).toEqual([3.34, 3.34, 3.33]);
    expect(parts.every((p) => p.manualAmount === p.total)).toBe(true);
    expect(parts.reduce((s, p) => s + Math.round(p.total * 100), 0)).toBe(1001);
  });
});
