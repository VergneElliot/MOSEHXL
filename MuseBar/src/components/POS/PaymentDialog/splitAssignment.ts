/**
 * Helpers for assigning / splitting order lines across payment carts.
 * Amounts use whole cents so closures stay exact.
 *
 * Part total = items sum + manual top-up.
 * The last part with no typed manual amount receives the residual so
 * parts sum to orderTotal; its displayed top-up is residual − items.
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

function billMethod(bill: LocalSubBill): 'cash' | 'card' {
  return bill.payments[0]?.method === 'cash' ? 'cash' : 'card';
}

function withPayment(bill: LocalSubBill, total: number, manualAmount: number | null): LocalSubBill {
  const method = billMethod(bill);
  return {
    ...bill,
    total,
    manualAmount,
    payments: [{ amount: total, method }],
  };
}

/** True when the cashier typed a manual top-up (locks this part out of residual). */
export function isBillAmountFixed(bill: LocalSubBill): boolean {
  return bill.manualAmount != null && Number.isFinite(bill.manualAmount);
}

/**
 * Last part without a typed manual amount receives the residual.
 * Item-only parts (manualAmount null) that are not that last slot are fixed at item sum.
 */
export function residualBillIndex(bills: LocalSubBill[]): number {
  const free = bills
    .map((bill, index) => (!isBillAmountFixed(bill) ? index : -1))
    .filter(index => index >= 0);
  return free.length > 0 ? free[free.length - 1]! : -1;
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
      const manual = Math.max(0, bill.manualAmount!);
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

  const fixedSumCents = prepared.reduce((sum, bill, index) => {
    if (index === residualIndex) return sum;
    return sum + cents(bill.total);
  }, 0);
  const residualBill = prepared[residualIndex]!;
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

/** Items still in the left pool (no share on any bill). */
export function unassignedItems(orderItems: OrderItem[], bills: LocalSubBill[]): OrderItem[] {
  const assignedSources = new Set(
    bills.flatMap(b => b.items.map(i => sourceItemId(i.id)))
  );
  return orderItems.filter(item => !assignedSources.has(item.id));
}

function syncBillItems(bill: LocalSubBill, items: OrderItem[]): LocalSubBill {
  return {
    ...bill,
    items,
    // Keep typed manual top-up; totals recomputed by caller
  };
}

/** Remove every share of the given source item ids from all bills. */
export function clearItemsFromBills(
  bills: LocalSubBill[],
  sourceIds: string[],
  orderTotal?: number
): LocalSubBill[] {
  const ids = new Set(sourceIds);
  const next = bills.map(bill => {
    const items = bill.items.filter(i => !ids.has(sourceItemId(i.id)));
    return syncBillItems(bill, items);
  });
  return orderTotal != null ? recomputeBillTotals(next, orderTotal) : next;
}

/** Move whole item(s) onto one bill (keeps that bill's manual top-up). */
export function moveItemsToBill(
  bills: LocalSubBill[],
  items: OrderItem[],
  billIndex: number,
  orderTotal?: number
): LocalSubBill[] {
  if (!bills[billIndex] || items.length === 0) return bills;
  const sourceIds = items.map(i => i.id);
  let next = clearItemsFromBills(bills, sourceIds);
  const target = next[billIndex]!;
  const merged = [...target.items];
  for (const item of items) {
    merged.push({ ...item });
  }
  next[billIndex] = syncBillItems(target, merged);
  return orderTotal != null ? recomputeBillTotals(next, orderTotal) : next;
}

/**
 * Split each item equally across selected bill indices (whole cents).
 */
export function splitItemsAcrossBills(
  bills: LocalSubBill[],
  items: OrderItem[],
  billIndices: number[],
  orderTotal?: number
): LocalSubBill[] {
  const targets = [...new Set(billIndices)]
    .filter(i => i >= 0 && i < bills.length)
    .sort((a, b) => a - b);
  if (targets.length === 0 || items.length === 0) return bills;

  const totalC = items.reduce((sum, item) => sum + cents(item.totalPrice), 0);
  const shares = resolveSplitShareCents(
    totalC,
    targets,
    Object.fromEntries(targets.map(i => [i, null]))
  );
  return splitItemsByShareCents(bills, items, shares, orderTotal);
}

/**
 * Resolve per-part share cents for a pool of selected items.
 * - No typed amounts → equal split (remainder cents on last part).
 * - Some typed → typed parts fixed; last empty part gets the residual;
 *   other empty parts get 0.
 */
export function resolveSplitShareCents(
  totalCents: number,
  selectedIndices: number[],
  rawAmounts: Record<number, number | null | undefined>
): Record<number, number> {
  const targets = [...new Set(selectedIndices)].sort((a, b) => a - b);
  const result: Record<number, number> = {};
  if (targets.length === 0 || totalCents <= 0) {
    targets.forEach(i => {
      result[i] = 0;
    });
    return result;
  }

  const parsed = targets.map(index => {
    const v = rawAmounts[index];
    if (v == null || !Number.isFinite(v) || v < 0) return { index, cents: null as number | null };
    return { index, cents: cents(v) };
  });

  const anyTyped = parsed.some(p => p.cents != null);
  if (!anyTyped) {
    const n = targets.length;
    const base = Math.floor(totalCents / n);
    const rem = totalCents - base * n;
    targets.forEach((index, shareIndex) => {
      result[index] = base + (shareIndex < rem ? 1 : 0);
    });
    return result;
  }

  const free = parsed.filter(p => p.cents == null).map(p => p.index);
  const residualIndex = free.length > 0 ? free[free.length - 1]! : -1;

  let fixedSum = 0;
  for (const p of parsed) {
    if (p.index === residualIndex) continue;
    const c = p.cents ?? 0;
    result[p.index] = c;
    fixedSum += c;
  }
  if (residualIndex >= 0) {
    result[residualIndex] = Math.max(0, totalCents - fixedSum);
  }
  return result;
}

/** Largest-remainder distribution of totalC across weights (exact sum). */
export function distributeCentsByWeights(totalC: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const wSum = weights.reduce((a, b) => a + b, 0);
  if (totalC <= 0 || wSum <= 0) return Array(n).fill(0);

  const raw = weights.map(w => (totalC * w) / wSum);
  const floors = raw.map(r => Math.floor(r));
  let rem = totalC - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - floors[i]! }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const out = [...floors];
  for (let k = 0; k < rem; k++) {
    const slot = order[k % n]!;
    out[slot.i] = (out[slot.i] ?? 0) + 1;
  }
  return out;
}

/**
 * Split items onto bills according to exact share cents (must cover item totals).
 */
export function splitItemsByShareCents(
  bills: LocalSubBill[],
  items: OrderItem[],
  shareCentsByBill: Record<number, number>,
  orderTotal?: number
): LocalSubBill[] {
  const allTargets = Object.keys(shareCentsByBill)
    .map(k => parseInt(k, 10))
    .filter(i => i >= 0 && i < bills.length)
    .sort((a, b) => a - b);

  if (allTargets.length === 0 || items.length === 0) return bills;

  const sourceIds = items.map(i => i.id);
  let next = clearItemsFromBills(bills, sourceIds);
  const weights = allTargets.map(i => Math.max(0, shareCentsByBill[i] ?? 0));

  for (const item of items) {
    const totalC = cents(item.totalPrice);
    const parts = distributeCentsByWeights(totalC, weights);
    allTargets.forEach((billIndex, shareIndex) => {
      const partC = parts[shareIndex] ?? 0;
      if (partC <= 0) return;
      const partAmount = fromCents(partC);
      const share: OrderItem = {
        ...item,
        id: `${item.id}::split::${billIndex}`,
        quantity: item.quantity * (partC / totalC),
        unitPrice: partAmount,
        totalPrice: partAmount,
        taxAmount: totalC > 0 ? (item.taxAmount * partC) / totalC : 0,
      };
      const bill = next[billIndex]!;
      next[billIndex] = syncBillItems(bill, [...bill.items, share]);
    });
  }

  return orderTotal != null ? recomputeBillTotals(next, orderTotal) : next;
}

/** Index of residual (auto) part among a dialog selection, or -1. */
export function dialogResidualIndex(
  selectedIndices: number[],
  rawAmounts: Record<number, number | null | undefined>
): number {
  const targets = [...new Set(selectedIndices)].sort((a, b) => a - b);
  const anyTyped = targets.some(i => {
    const v = rawAmounts[i];
    return v != null && Number.isFinite(v) && v >= 0;
  });
  if (!anyTyped) {
    return targets.length > 0 ? targets[targets.length - 1]! : -1;
  }
  const free = targets.filter(i => {
    const v = rawAmounts[i];
    return v == null || !Number.isFinite(v) || v < 0;
  });
  return free.length > 0 ? free[free.length - 1]! : -1;
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

/** Cash / card totals from sub-bills (by each bill's payment method). */
export function paymentMethodBreakdown(bills: LocalSubBill[]): { cash: number; card: number } {
  return bills.reduce(
    (acc, bill) => {
      const method = billMethod(bill);
      if (method === 'cash') acc.cash = fromCents(cents(acc.cash) + cents(bill.total));
      else acc.card = fromCents(cents(acc.card) + cents(bill.total));
      return acc;
    },
    { cash: 0, card: 0 }
  );
}

/** Normalize product taxRate (0.1 / 10 / 0.2 / 20) to a fraction. */
export function normalizeTaxRate(rate: number): number {
  if (!Number.isFinite(rate) || rate < 0) return 0;
  return rate > 1 ? rate / 100 : rate;
}

/** TVA buckets for the order (sale lines): 10% then 20%. */
export function taxBreakdownByRate(items: OrderItem[]): { rate10: number; rate20: number; other: number } {
  let rate10 = 0;
  let rate20 = 0;
  let other = 0;
  for (const item of items) {
    if (item.isTip) continue;
    const r = normalizeTaxRate(item.taxRate);
    const tax = item.taxAmount || 0;
    if (Math.abs(r - 0.1) < 0.001) rate10 = fromCents(cents(rate10) + cents(tax));
    else if (Math.abs(r - 0.2) < 0.001) rate20 = fromCents(cents(rate20) + cents(tax));
    else other = fromCents(cents(other) + cents(tax));
  }
  return { rate10, rate20, other };
}
