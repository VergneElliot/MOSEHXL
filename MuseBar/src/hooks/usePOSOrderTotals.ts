import { useCallback, useMemo } from 'react';
import { OrderItem } from '../types';

export interface POSOrderTotals {
  orderTotal: number;
  orderTax: number;
  orderSubtotal: number;
  /** Sum of tip lines (isTip) — not included in orderTotal / CA. */
  tipsTotal: number;
  canProcessPayment: boolean;
}

/** Sale lines only (excludes card tips). */
export function saleLines(order: OrderItem[]): OrderItem[] {
  return order.filter(item => !item.isTip);
}

export function tipsFromOrder(order: OrderItem[]): number {
  return order
    .filter(item => item.isTip)
    .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export const usePOSOrderTotals = (currentOrder: OrderItem[]): POSOrderTotals => {
  const calculateItemTotal = useCallback((item: OrderItem): number => {
    return item.unitPrice * item.quantity;
  }, []);

  const tipsTotal = useMemo(() => tipsFromOrder(currentOrder), [currentOrder]);

  const orderSubtotal = useMemo(() => {
    return saleLines(currentOrder).reduce((total, item) => total + calculateItemTotal(item), 0);
  }, [currentOrder, calculateItemTotal]);

  const orderTax = useMemo(() => {
    return saleLines(currentOrder).reduce((total, item) => total + item.taxAmount, 0);
  }, [currentOrder]);

  const orderTotal = useMemo(() => orderSubtotal, [orderSubtotal]);

  const canProcessPayment = useMemo(() => {
    return currentOrder.length > 0 && orderTotal >= 0;
  }, [currentOrder.length, orderTotal]);

  return {
    orderTotal,
    orderTax,
    orderSubtotal,
    tipsTotal,
    canProcessPayment,
  };
};
