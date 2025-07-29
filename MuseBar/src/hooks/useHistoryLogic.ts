import { useMemo } from 'react';
import { Order } from '../types';

export interface HistoryLogic {
  filteredOrders: Order[];
  formatCurrency: (amount: number) => string;
  formatDateTime: (date: Date | string) => string;
  getPaymentMethodLabel: (method: string) => string;
  getStatusColor: (
    status: string
  ) => 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  calculateOrderTotal: (order: Order) => number;
  getOrderSummary: (order: Order) => string;
}

export const useHistoryLogic = (orders: Order[], search: string): HistoryLogic => {
  // Filter orders based on search query
  const filteredOrders = useMemo(() => {
    if (!search.trim()) {
      return orders;
    }

    const searchLower = search.toLowerCase();
    return orders.filter(order => {
      // Search by order ID
      if (order.id.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search by date
      const dateStr = new Date(order.createdAt).toLocaleDateString('fr-FR');
      if (dateStr.includes(searchLower)) {
        return true;
      }

      // Search by payment method
      if (getPaymentMethodLabel(order.paymentMethod).toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search by order items
      const hasMatchingItem = order.items.some(item =>
        item.productName.toLowerCase().includes(searchLower)
      );
      if (hasMatchingItem) {
        return true;
      }

      // Search by total amount
      const totalStr = formatCurrency(order.totalAmount);
      if (totalStr.includes(search)) {
        return true;
      }

      return false;
    });
  }, [orders, search]);

  // Utility functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDateTime = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodLabel = (method: string): string => {
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
  };

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
    // Calculate base total from items
    const itemsTotal = order.items.reduce((total, item) => total + item.totalPrice, 0);

    // Add tips if any
    const tips = order.tips || 0;

    // Subtract change if any
    const change = order.change || 0;

    return itemsTotal + tips - change;
  };

  const getOrderSummary = (order: Order): string => {
    const itemCount = order.items.length;
    const firstItems = order.items.slice(0, 2);
    const summary = firstItems.map(item => `${item.quantity}x ${item.productName}`).join(', ');

    if (itemCount > 2) {
      return `${summary}, +${itemCount - 2} autre${itemCount - 2 > 1 ? 's' : ''}`;
    }

    return summary;
  };

  return {
    filteredOrders,
    formatCurrency,
    formatDateTime,
    getPaymentMethodLabel,
    getStatusColor,
    calculateOrderTotal,
    getOrderSummary,
  };
};
