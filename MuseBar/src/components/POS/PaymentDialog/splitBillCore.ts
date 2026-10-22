/**
 * Primitive helpers shared by the split-bill modules.
 * Amounts use whole cents so closures stay exact.
 */

import type { OrderItem, LocalSubBill } from '../../../types';

export function cents(n: number): number {
  return Math.round(n * 100);
}

export function fromCents(c: number): number {
  return c / 100;
}

export function sourceItemId(id: string): string {
  return id.split('::split::')[0] ?? id;
}

export function billTotalFromItems(items: OrderItem[]): number {
  return fromCents(items.reduce((sum, item) => sum + cents(item.totalPrice), 0));
}

export function billMethod(bill: LocalSubBill): 'cash' | 'card' {
  return bill.payments[0]?.method === 'cash' ? 'cash' : 'card';
}

export function withPayment(
  bill: LocalSubBill,
  total: number,
  manualAmount: number | null
): LocalSubBill {
  const method = billMethod(bill);
  return {
    ...bill,
    total,
    manualAmount,
    payments: [{ amount: total, method }],
  };
}

/** Replaces a bill's items; typed manual top-up is kept, totals recomputed by caller. */
export function syncBillItems(bill: LocalSubBill, items: OrderItem[]): LocalSubBill {
  return {
    ...bill,
    items,
  };
}

/** True when the cashier typed a manual top-up (locks this part out of residual). */
export function isBillAmountFixed(bill: LocalSubBill): boolean {
  return bill.manualAmount != null && Number.isFinite(bill.manualAmount);
}

/** Items still in the left pool (no share on any bill). */
export function unassignedItems(orderItems: OrderItem[], bills: LocalSubBill[]): OrderItem[] {
  const assignedSources = new Set(
    bills.flatMap(b => b.items.map(i => sourceItemId(i.id)))
  );
  return orderItems.filter(item => !assignedSources.has(item.id));
}
