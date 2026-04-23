import { request } from './core';
import { Order, OrderItem } from '../../types';
import type { PaymentMethod } from '../../types';

interface RawOrderItem {
  id?: string | number;
  product_id?: string | number | null;
  product_name?: string;
  quantity?: number | string;
  unit_price?: number | string;
  total_price?: number | string;
  tax_rate?: number | string;
  tax_amount?: number | string;
  happy_hour_applied?: boolean;
  is_manual_happy_hour?: boolean;
}

interface RawSubBill {
  id?: string | number;
  payment_method?: 'cash' | 'card';
  amount?: number | string;
  status?: 'pending' | 'paid';
  created_at?: string | Date;
}

interface RawOrder {
  id: string | number;
  items?: RawOrderItem[];
  sub_bills?: RawSubBill[];
  total_amount: number | string;
  total_tax: number | string;
  created_at: string | Date;
  status: 'pending' | 'completed' | 'cancelled';
  payment_method: PaymentMethod;
  notes?: string;
  tips?: number;
  change?: number;
  operation_type?: 'sale' | 'change';
  change_amount?: number | string | null;
}

function toNumber(value: unknown, fallback: number = 0): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? parseFloat(value)
        : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapRawItem(orderId: string | number, item: RawOrderItem): OrderItem {
  const totalPrice = toNumber(item.total_price);
  const unitPrice = toNumber(item.unit_price);
  const taxRate = toNumber(item.tax_rate, 20) / 100;

  return {
    id: item.id ? String(item.id) : `${orderId}-${item.product_id || 'unknown'}`,
    productId: item.product_id ? String(item.product_id) : 'unknown',
    productName: item.product_name || 'Unknown Product',
    quantity: toNumber(item.quantity, 1),
    unitPrice,
    totalPrice,
    taxRate,
    taxAmount: toNumber(item.tax_amount),
    isHappyHourApplied: Boolean(item.happy_hour_applied),
    isManualHappyHour: Boolean(item.happy_hour_applied && item.is_manual_happy_hour),
    isOffert: totalPrice === 0,
    originalPrice: unitPrice,
  };
}

function mapRawOrder(order: RawOrder): Order {
  return {
    id: String(order.id),
    items: (order.items || []).map((item) => mapRawItem(order.id, item)),
    totalAmount: toNumber(order.total_amount),
    taxAmount: toNumber(order.total_tax),
    discountAmount: 0,
    finalAmount: toNumber(order.total_amount),
    createdAt: new Date(order.created_at),
    status: order.status,
    paymentMethod: order.payment_method,
    subBills: (order.sub_bills || []).map((subBill) => ({
      id: String(subBill.id),
      orderId: String(order.id),
      paymentMethod: subBill.payment_method as 'cash' | 'card',
      amount: toNumber(subBill.amount),
      status: subBill.status as 'pending' | 'paid',
      createdAt: new Date(subBill.created_at || new Date()),
    })),
    notes: order.notes,
    tips: order.tips || 0,
    change: order.change || 0,
    operationType: order.operation_type as 'sale' | 'change' | undefined,
    changeAmount: order.change_amount != null ? toNumber(order.change_amount) : null,
  };
}

export async function getOrders(): Promise<Order[]> {
  const orders = await request<RawOrder[]>('/orders');
  return orders.map(mapRawOrder);
}

export async function getOrdersPaginated(params: {
  limit?: number;
  offset?: number;
}): Promise<{ orders: Order[]; total: number }> {
  const query = new URLSearchParams();
  if (params.limit != null) query.set('limit', String(params.limit));
  if (params.offset != null) query.set('offset', String(params.offset));

  const response = await request<RawOrder[] | { orders?: RawOrder[]; total?: number }>(
    '/orders' + (query.toString() ? `?${query.toString()}` : '')
  );

  // Backend supports both the legacy shape (array) and paginated shape ({orders,total}).
  const rawOrders: RawOrder[] = Array.isArray(response) ? response : response?.orders ?? [];
  const total: number = Array.isArray(response) ? rawOrders.length : response?.total ?? rawOrders.length;
  const orders = rawOrders.map(mapRawOrder);

  return { orders, total };
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
  // Accounting: send exact amounts for storage (no rounding). Taxes are derived from
  // prices (taxAmount = totalPrice * taxRate / (1+taxRate)) and may be non-terminating;
  // rounding is for display only to avoid cumulative drift in closures/audits.
  const result = await request<RawOrder>('/orders', {
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
        product_id: item.productId ? (isNaN(parseInt(String(item.productId))) ? null : parseInt(String(item.productId))) : null,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        tax_rate: item.taxRate,
        tax_amount: item.taxAmount ?? (item.totalPrice * item.taxRate) / (1 + item.taxRate),
        happy_hour_applied: item.isHappyHourApplied,
        happy_hour_discount_amount: item.isHappyHourApplied ? (item.originalPrice ? (item.originalPrice - item.unitPrice) * item.quantity : 0) : 0,
        is_manual_happy_hour:
          item.isHappyHourApplied === true && item.isManualHappyHour === true,
        description: item.description || null,
      })),
      ...(order.sub_bills ? { sub_bills: order.sub_bills } : {}),
    }),
  });

  return {
    id: result.id.toString(),
    items: order.items,
    totalAmount: toNumber(result.total_amount),
    taxAmount: toNumber(result.total_tax),
    discountAmount: 0,
    finalAmount: toNumber(result.total_amount),
    createdAt: new Date(result.created_at),
    status: result.status,
    paymentMethod: order.paymentMethod,
    subBills: (result.sub_bills || []).map((subBill) => ({
      id: String(subBill.id),
      orderId: String(result.id),
      paymentMethod: subBill.payment_method as 'cash' | 'card',
      amount: toNumber(subBill.amount),
      status: subBill.status as 'pending' | 'paid',
      createdAt: new Date(subBill.created_at || new Date()),
    })),
  };
}



