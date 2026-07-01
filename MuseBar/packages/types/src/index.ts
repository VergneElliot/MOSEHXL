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
  options?: OrderItemOptionRecord[];
  kitchen_printer_ids_snapshot?: KitchenPrinterLineSnapshotRecord[];
  print_pickup_slip_snapshot?: boolean;
}

export interface KitchenPrinterLineSnapshotRecord {
  id: number;
  name: string;
  slug: string;
}

export interface KitchenPrinterRecord {
  id: number;
  establishment_id?: string;
  name: string;
  slug: string;
  connection_type: 'bridge' | 'network_escpos';
  connection_config: Record<string, unknown>;
  display_order: number;
  is_active: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface OrderItemOptionRecord {
  id: number;
  order_item_id: number;
  establishment_id?: string;
  group_id: number | null;
  group_name_snapshot: string;
  choice_id: number | null;
  choice_label_snapshot: string | null;
  free_text: string | null;
  display_order: number;
  created_at?: string | Date;
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

export interface ProductRecord {
  id: number | string;
  name: string;
  description?: string | null;
  price: number | string;
  tax_rate: number | string;
  category_id: number | string;
  happy_hour_discount_percent?: number | string | null;
  happy_hour_discount_fixed?: number | string | null;
  is_happy_hour_eligible: boolean;
  is_active?: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  option_group_ids?: number[];
  option_groups?: ProductOptionGroupRecord[];
  kitchen_printer_ids?: number[];
  kitchen_printers?: KitchenPrinterRecord[];
  print_pickup_slip?: boolean;
}

export interface ProductOptionChoiceRecord {
  id: number;
  group_id: number;
  establishment_id?: string;
  label: string;
  display_order: number;
  is_active: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface ProductOptionGroupRecord {
  id: number;
  establishment_id?: string;
  name: string;
  is_required: boolean;
  allow_free_text: boolean;
  free_text_label?: string | null;
  free_text_max_length: number;
  display_order: number;
  is_active: boolean;
  choices: ProductOptionChoiceRecord[];
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface CategoryRecord {
  id: number | string;
  name: string;
  description?: string | null;
  color?: string | null;
  is_active?: boolean;
  created_at: string | Date;
  updated_at: string | Date;
}
