export type PaymentMethod = 'cash' | 'card' | 'split';
export type OrderStatus = 'pending' | 'completed' | 'cancelled';
export type SubBillStatus = 'pending' | 'paid';
export type OperationType = 'sale' | 'change';
export const PERMISSIONS = {
  access_pos: 'access_pos',
  access_menu: 'access_menu',
  access_settings: 'access_settings',
  access_closure: 'access_closure',
  access_compliance: 'access_compliance',
  access_user_management: 'access_user_management',
  pos_happyhour_manual: 'pos_happyhour_manual',
  pos_apply_offert: 'pos_apply_offert',
  pos_apply_perso: 'pos_apply_perso',
  orders_cancel: 'orders_cancel',
} as const;
export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface Order {
  id: number;
  establishment_id: string | null;
  total_amount: number;
  total_tax: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  notes?: string;
  tips?: number;
  change?: number;
  operation_type?: OperationType;
  change_amount?: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: number;
  establishment_id?: string | null;
  order_id: number;
  product_id?: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  happy_hour_applied: boolean;
  happy_hour_discount_amount: number;
  is_manual_happy_hour?: boolean;
  sub_bill_id?: number;
  description?: string;
  created_at: Date;
}

export interface SubBill {
  id: number;
  establishment_id?: string | null;
  order_id: number;
  payment_method: 'cash' | 'card';
  amount: number;
  status: SubBillStatus;
  created_at: Date;
}
