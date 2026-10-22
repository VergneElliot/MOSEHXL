/**
 * Whole-item moves between the pool and the payment carts.
 */

import type { OrderItem, LocalSubBill } from '../../../types';
import { sourceItemId, syncBillItems } from './splitBillCore';
import { recomputeBillTotals } from './splitBillTotals';

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
  const sourceIds = items.map(i => sourceItemId(i.id));
  const next = clearItemsFromBills(bills, sourceIds);
  const target = next[billIndex];
  if (!target) return bills;
  const merged = [...target.items];
  for (const item of items) {
    merged.push({ ...item, id: sourceItemId(item.id) });
  }
  next[billIndex] = syncBillItems(target, merged);
  return orderTotal != null ? recomputeBillTotals(next, orderTotal) : next;
}
