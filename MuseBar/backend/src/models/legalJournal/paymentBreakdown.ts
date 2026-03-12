/**
 * Payment breakdown aggregation from orders.
 * Same rules as closure bulletins: change operations (+card -cash), split from sub_bills, tips (-cash).
 * Single source of truth so History tab stats and closure reports stay aligned.
 */

import { PaymentBreakdown } from './types';

export interface OrderRow {
  id: number;
  total_amount?: string | number | null;
  payment_method?: string;
  operation_type?: string;
  change_amount?: string | number | null;
  tips?: string | number | null;
}

export interface SubBillRow {
  order_id: number;
  payment_method: string;
  amount: string | number;
}

/**
 * Computes total amount and card/cash breakdown from orders and sub_bills.
 * Applies: change ops (+card -cash), split from sub_bills, then tips (-cash).
 */
export function computePaymentBreakdownFromOrders(
  orders: OrderRow[],
  subBills: SubBillRow[]
): { totalAmount: number; paymentBreakdown: PaymentBreakdown } {
  let totalAmount = 0;
  const paymentBreakdown: PaymentBreakdown = {};

  for (const order of orders) {
    const orderAmount = typeof order.total_amount === 'number'
      ? order.total_amount
      : parseFloat(String(order.total_amount ?? 0));

    // Skip any orders with non-finite totals to avoid propagating NaN into stats.
    if (!Number.isFinite(orderAmount)) {
      continue;
    }

    totalAmount += orderAmount;

    if (order.operation_type === 'change' && order.change_amount != null) {
      const x = typeof order.change_amount === 'number'
        ? order.change_amount
        : parseFloat(String(order.change_amount));
      if (!Number.isFinite(x)) {
        continue;
      }
      paymentBreakdown['card'] = (paymentBreakdown['card'] || 0) + x;
      paymentBreakdown['cash'] = (paymentBreakdown['cash'] || 0) - x;
    } else if (order.payment_method === 'split') {
      // Filled from sub_bills below
    } else {
      const method = (order.payment_method === 'card' ? 'card' : 'cash') as keyof PaymentBreakdown;
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + orderAmount;
    }
  }

  const splitOrderIds = orders.filter(o => o.payment_method === 'split').map(o => o.id);
  for (const row of subBills) {
    if (!splitOrderIds.includes(row.order_id)) continue;
    const method = (row.payment_method === 'card' ? 'card' : 'cash') as keyof PaymentBreakdown;
    const amount = typeof row.amount === 'number'
      ? row.amount
      : parseFloat(String(row.amount ?? 0));
    if (!Number.isFinite(amount)) {
      continue;
    }
    paymentBreakdown[method] = (paymentBreakdown[method] || 0) + amount;
  }

  const tipsTotal = Math.max(
    0,
    orders.reduce((sum, o) => {
      const tip = typeof o.tips === 'number'
        ? o.tips
        : parseFloat(String(o.tips || '0'));
      if (!Number.isFinite(tip) || tip < 0) {
        return sum;
      }
      return sum + tip;
    }, 0)
  );
  if (tipsTotal > 0) {
    paymentBreakdown['cash'] = (paymentBreakdown['cash'] || 0) - tipsTotal;
  }

  return { totalAmount, paymentBreakdown };
}
