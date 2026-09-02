import { useMemo } from 'react';
import { Order } from '../types';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

export function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'cash':
      return 'Espèces';
    case 'card':
      return 'Carte';
    case 'split':
      return 'Mixte';
    default:
      return method;
  }
}

export interface HistoryLogic {
  formatCurrency: (amount: number) => string;
  formatDateTime: (date: Date | string) => string;
  getPaymentMethodLabel: (method: string) => string;
  getStatusColor: (
    status: string
  ) => 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  calculateOrderTotal: (order: Order) => number;
  getOrderSummary: (order: Order) => string;
}

export const useHistoryLogic = (): HistoryLogic => {
  const formatDateTime = (date: Date | string): string => formatDate(date);

  const getStatusColor = (
    status: string
  ): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const calculateOrderTotal = (order: Order): number => {
    const itemsTotal = order.items.reduce((total, item) => total + item.totalPrice, 0);
    const tips = order.tips || 0;
    const change = order.change || 0;
    return itemsTotal + tips - change;
  };

  const getOrderSummary = (order: Order): string => {
    const itemCount = order.items.length;
    const firstItems = order.items.slice(0, 2);
    const summary = firstItems.map((item) => `${item.quantity}x ${item.productName}`).join(', ');
    if (itemCount > 2) {
      return `${summary}, +${itemCount - 2} autre${itemCount - 2 > 1 ? 's' : ''}`;
    }
    return summary;
  };

  return useMemo(
    () => ({
      formatCurrency,
      formatDateTime,
      getPaymentMethodLabel,
      getStatusColor,
      calculateOrderTotal,
      getOrderSummary,
    }),
    []
  );
};
