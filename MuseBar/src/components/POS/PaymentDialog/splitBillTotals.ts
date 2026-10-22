/**
 * Part totals for the split board.
 *
 * Part total = items sum + manual top-up.
 * The last part with no typed manual amount receives the residual so
 * parts sum to orderTotal; its displayed top-up is residual − items.
 */

import type { LocalSubBill } from '../../../types';
import {
  billTotalFromItems,
  cents,
  fromCents,
  isBillAmountFixed,
  withPayment,
} from './splitBillCore';

/**
 * Last part without a typed manual amount receives the residual.
 * Item-only parts (manualAmount null) that are not that last slot are fixed at item sum.
 */
export function residualBillIndex(bills: LocalSubBill[]): number {
  const free = bills
    .map((bill, index) => (!isBillAmountFixed(bill) ? index : -1))
    .filter(index => index >= 0);
  const last = free[free.length - 1];
  return last ?? -1;
}

/**
 * Recompute totals:
 * - typed manual → total = items + manual
 * - non-residual, no manual → total = items
 * - residual → total = orderTotal − sum(others); implied top-up = total − items
 */
export function recomputeBillTotals(bills: LocalSubBill[], orderTotal: number): LocalSubBill[] {
  if (bills.length === 0) return bills;

  const residualIndex = residualBillIndex(bills);

  const prepared: LocalSubBill[] = bills.map((bill, index) => {
    const itemSum = billTotalFromItems(bill.items);

    if (isBillAmountFixed(bill)) {
      const manual = Math.max(0, bill.manualAmount ?? 0);
      return withPayment(bill, fromCents(cents(itemSum) + cents(manual)), manual);
    }

    if (index !== residualIndex) {
      // Item-only (or empty) non-residual: contribution is items only
      return withPayment(bill, itemSum, null);
    }

    // Residual placeholder — filled below
    return withPayment(bill, itemSum, null);
  });

  if (residualIndex < 0) {
    return prepared;
  }

  const residualBill = prepared[residualIndex];
  if (!residualBill) {
    return prepared;
  }

  const fixedSumCents = prepared.reduce((sum, bill, index) => {
    if (index === residualIndex) return sum;
    return sum + cents(bill.total);
  }, 0);
  const residualItemSum = billTotalFromItems(residualBill.items);
  const residualTotal = Math.max(
    residualItemSum,
    Math.max(0, fromCents(cents(orderTotal) - fixedSumCents))
  );

  return prepared.map((bill, index) => {
    if (index !== residualIndex) return bill;
    return withPayment(residualBill, residualTotal, null);
  });
}

/** Manual top-up shown in the field (for residual: total − items). */
export function billManualDisplay(bill: LocalSubBill, isResidual: boolean): number {
  const itemSum = billTotalFromItems(bill.items);
  if (isResidual) {
    return Math.max(0, fromCents(cents(bill.total) - cents(itemSum)));
  }
  if (bill.manualAmount != null && Number.isFinite(bill.manualAmount)) {
    return Math.max(0, bill.manualAmount);
  }
  return 0;
}

export function createEmptyBills(count: number, existing?: LocalSubBill[]): LocalSubBill[] {
  const n = Math.max(1, count);
  return Array.from({ length: n }, (_, index) => {
    const prev = existing?.[index];
    const method = prev?.payments[0]?.method === 'cash' ? 'cash' : 'card';
    return {
      id: prev?.id ?? `split-${index + 1}`,
      total: 0,
      payments: [{ amount: 0, method }],
      items: [],
      tip: '0',
      manualAmount: null,
    };
  });
}

/**
 * Set / clear typed manual top-up (does not clear items).
 * Empty input → manualAmount null (part may become residual).
 */
export function setBillManualAmount(
  bills: LocalSubBill[],
  billIndex: number,
  raw: string,
  orderTotal: number
): LocalSubBill[] {
  const bill = bills[billIndex];
  if (!bill) return bills;

  const trimmed = raw.trim().replace(',', '.');
  let next: LocalSubBill[];

  if (trimmed === '') {
    next = bills.map((b, i) => (i === billIndex ? { ...b, manualAmount: null } : b));
  } else {
    const value = parseFloat(trimmed);
    if (!Number.isFinite(value) || value < 0) return bills;
    next = bills.map((b, i) => (i === billIndex ? { ...b, manualAmount: value } : b));
  }

  return recomputeBillTotals(next, orderTotal);
}

/** Equal money split of orderTotal across N bills (no line items). */
export function equalAmountBills(
  count: number,
  orderTotal: number,
  existing?: LocalSubBill[]
): LocalSubBill[] {
  const n = Math.max(1, count);
  const totalC = cents(orderTotal);
  const base = Math.floor(totalC / n);
  const rem = totalC - base * n;
  return Array.from({ length: n }, (_, index) => {
    const prev = existing?.[index];
    const method = prev?.payments[0]?.method === 'cash' ? 'cash' : 'card';
    const part = fromCents(base + (index < rem ? 1 : 0));
    return {
      id: prev?.id ?? `split-${index + 1}`,
      total: part,
      payments: [{ amount: part, method }],
      items: [],
      tip: '0',
      manualAmount: part,
    };
  });
}
