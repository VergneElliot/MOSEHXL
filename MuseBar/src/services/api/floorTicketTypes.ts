export interface OpenTicketDto {
  id: number;
  establishment_id: string;
  dining_table_id: number;
  status: 'open' | 'closed' | 'cancelled';
  opened_by_user_id: number | null;
  last_served_by_user_id: number | null;
  covers: number | null;
  notes: string | null;
  order_id: number | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface OpenTicketItemDto {
  id: number;
  open_ticket_id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  happy_hour_applied: boolean;
  happy_hour_discount_amount: number;
  is_manual_happy_hour: boolean;
  description: string;
  options_json: unknown;
  kitchen_printer_ids_snapshot: unknown;
  print_pickup_slip_snapshot: boolean;
  sort_order: number;
  line_status?: 'draft' | 'validated' | 'cancelled';
  validated_at?: string | null;
  kitchen_sent_at?: string | null;
  served_at?: string | null;
}

export interface KitchenPrintResult {
  enqueued: number;
  failures: number;
}
