/**
 * Payment-method and TVA breakdowns displayed on the payment dialog.
 */

import type { OrderItem, LocalSubBill } from '../../../types';
import { billMethod, cents, fromCents } from './splitBillCore';

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
