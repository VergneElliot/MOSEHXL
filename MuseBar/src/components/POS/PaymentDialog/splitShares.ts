/**
 * Fractional shares: split selected items across several payment carts
 * by exact cent amounts (Répartir dialog and equal item splits).
 */

import type { OrderItem, LocalSubBill } from '../../../types';
import { cents, fromCents, syncBillItems } from './splitBillCore';
import { clearItemsFromBills } from './splitBillItems';
import { recomputeBillTotals } from './splitBillTotals';

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
  const residualIndex = free[free.length - 1] ?? -1;

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
  const rem = totalC - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - (floors[i] ?? 0) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const out = [...floors];
  for (let k = 0; k < rem; k++) {
    const slot = order[k % n];
    if (!slot) continue;
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
  const next = clearItemsFromBills(bills, sourceIds);
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
      const bill = next[billIndex];
      if (!bill) return;
      next[billIndex] = syncBillItems(bill, [...bill.items, share]);
    });
  }

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
    return targets[targets.length - 1] ?? -1;
  }
  const free = targets.filter(i => {
    const v = rawAmounts[i];
    return v == null || !Number.isFinite(v) || v < 0;
  });
  return free[free.length - 1] ?? -1;
}
