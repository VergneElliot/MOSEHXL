export type OpenTicketStatus = 'open' | 'closed' | 'cancelled';

export interface OpenTicket {
  id: number;
  establishment_id: string;
  dining_table_id: number;
  status: OpenTicketStatus;
  opened_by_user_id: number | null;
  last_served_by_user_id: number | null;
  covers: number | null;
  notes: string | null;
  order_id: number | null;
  created_at: Date;
  updated_at: Date;
  closed_at: Date | null;
}

export type OpenTicketLineStatus = 'draft' | 'validated' | 'cancelled';

export interface OpenTicketItemInput {
  product_id?: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  happy_hour_applied?: boolean;
  happy_hour_discount_amount?: number;
  is_manual_happy_hour?: boolean;
  description?: string;
  options_json?: unknown;
  kitchen_printer_ids_snapshot?: unknown;
  print_pickup_slip_snapshot?: boolean;
  sort_order?: number;
}

export interface OpenTicketItem extends OpenTicketItemInput {
  id: number;
  establishment_id: string;
  open_ticket_id: number;
  line_status: OpenTicketLineStatus;
  validated_at: Date | null;
  kitchen_sent_at: Date | null;
  served_at: Date | null;
  created_at: Date;
}
