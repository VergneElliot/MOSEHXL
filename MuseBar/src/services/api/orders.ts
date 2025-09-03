import { request } from './core';
import { Order, OrderItem } from '../../types';
import type { PaymentMethod } from '../../types';

export async function getOrders(): Promise<Order[]> {
  const orders = await request<any[]>('/orders');
  return orders.map(order => ({
    id: order.id.toString(),
    items: (order.items || []).map((item: any) => ({
      id: item.id ? item.id.toString() : `${order.id}-${item.product_id || 'unknown'}`,
      productId: item.product_id ? item.product_id.toString() : 'unknown',
      productName: item.product_name || 'Unknown Product',
      quantity: item.quantity || 1,
      unitPrice: parseFloat(item.unit_price || '0'),
      totalPrice: parseFloat(item.total_price || '0'),
      taxRate: parseFloat(item.tax_rate || '20') / 100,
      taxAmount: parseFloat(item.tax_amount || '0'),
      isHappyHourApplied: item.happy_hour_applied || false,
      isManualHappyHour: item.happy_hour_applied || false,
      isOffert: parseFloat(item.total_price || '0') === 0,
      originalPrice: parseFloat(item.unit_price || '0'),
    })),
    totalAmount: parseFloat(order.total_amount),
    taxAmount: parseFloat(order.total_tax),
    discountAmount: 0,
    finalAmount: parseFloat(order.total_amount),
    createdAt: new Date(order.created_at),
    status: order.status as 'pending' | 'completed' | 'cancelled',
    paymentMethod: order.payment_method as PaymentMethod,
    subBills: (order.sub_bills || []).map((subBill: any) => ({
      id: subBill.id.toString(),
      orderId: order.id.toString(),
      paymentMethod: subBill.payment_method as 'cash' | 'card',
      amount: parseFloat(subBill.amount),
      status: subBill.status as 'pending' | 'paid',
      createdAt: new Date(subBill.created_at),
    })),
    notes: order.notes,
    tips: order.tips || 0,
    change: order.change || 0,
  }));
}

export async function createOrder(order: {
  items: OrderItem[];
  totalAmount: number;
  taxAmount: number;
  paymentMethod: 'cash' | 'card' | 'split';
  status?: string;
  notes?: string;
  tips?: number;
  change?: number;
  sub_bills?: Array<{ payment_method: 'cash' | 'card'; amount: number }>;
}): Promise<Order> {
  const result = await request<any>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      total_amount: order.totalAmount,
      total_tax: order.taxAmount,
      payment_method: order.paymentMethod,
      status: order.status || 'completed',
      notes: order.notes,
      tips: order.tips || 0,
      change: order.change || 0,
      items: order.items.map(item => ({
        product_id: item.productId ? (isNaN(parseInt(item.productId)) ? null : parseInt(item.productId)) : null,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        tax_rate: item.taxRate,
        tax_amount: item.taxAmount || (item.totalPrice * item.taxRate) / (1 + item.taxRate),
        happy_hour_applied: item.isHappyHourApplied,
        happy_hour_discount_amount: item.isHappyHourApplied ? (item.originalPrice ? (item.originalPrice - item.unitPrice) * item.quantity : 0) : 0,
        description: item.description || null,
      })),
      ...(order.sub_bills ? { sub_bills: order.sub_bills } : {}),
    }),
  });

  return {
    id: result.id.toString(),
    items: order.items,
    totalAmount: parseFloat(result.total_amount),
    taxAmount: parseFloat(result.total_tax),
    discountAmount: 0,
    finalAmount: parseFloat(result.total_amount),
    createdAt: new Date(result.created_at),
    status: result.status,
    paymentMethod: order.paymentMethod,
    subBills: (result.sub_bills || []).map((subBill: any) => ({
      id: subBill.id.toString(),
      orderId: result.id.toString(),
      paymentMethod: subBill.payment_method as 'cash' | 'card',
      amount: parseFloat(subBill.amount),
      status: subBill.status as 'pending' | 'paid',
      createdAt: new Date(subBill.created_at),
    })),
  };
}



