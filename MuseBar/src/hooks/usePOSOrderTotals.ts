import { useCallback, useMemo } from 'react';
import { OrderItem } from '../types';

export interface POSOrderTotals {
  orderTotal: number;
  orderTax: number;
  orderSubtotal: number;
  canProcessPayment: boolean;
}

export const usePOSOrderTotals = (currentOrder: OrderItem[]): POSOrderTotals => {
  const calculateItemTotal = useCallback((item: OrderItem): number => {
    return item.unitPrice * item.quantity;
  }, []);

  const orderSubtotal = useMemo(() => {
    return currentOrder.reduce((total, item) => total + calculateItemTotal(item), 0);
  }, [currentOrder, calculateItemTotal]);

  const orderTax = useMemo(() => {
    return currentOrder.reduce((total, item) => total + item.taxAmount, 0);
  }, [currentOrder]);

  const orderTotal = useMemo(() => orderSubtotal, [orderSubtotal]);

  const canProcessPayment = useMemo(() => {
    return currentOrder.length > 0 && orderTotal >= 0;
  }, [currentOrder.length, orderTotal]);

  return {
    orderTotal,
    orderTax,
    orderSubtotal,
    canProcessPayment,
  };
};
