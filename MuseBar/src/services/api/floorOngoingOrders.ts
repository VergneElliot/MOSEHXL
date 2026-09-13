import { request } from './core';

export interface OngoingOrderItemDto {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  line_status: 'draft' | 'validated';
  kitchen_sent_at: string | null;
  validated_at: string | null;
  served_at: string | null;
  fulfillment_status: 'validated' | 'sent' | 'served';
}

export interface OngoingOrderDto {
  ticket_id: number;
  table_id: number;
  table_label: string;
  waiter_user_id: number | null;
  waiter_display_name: string | null;
  updated_at: string;
  validated_line_count: number;
  sent_line_count: number;
  served_line_count: number;
  draft_line_count: number;
  total_amount: number;
  items: OngoingOrderItemDto[];
}

export async function listOngoingOrders(): Promise<OngoingOrderDto[]> {
  const res = await request<{ orders: OngoingOrderDto[] }>('/floor/ongoing-orders');
  return res.orders ?? [];
}

export async function setTicketItemFulfillment(
  ticketId: number,
  itemId: number,
  status: 'sent' | 'served',
  pinActorToken: string
): Promise<OngoingOrderItemDto> {
  const res = await request<{ item: OngoingOrderItemDto }>(
    `/floor/tickets/${ticketId}/items/${itemId}/fulfillment`,
    {
      method: 'POST',
      headers: { 'x-pin-actor-token': pinActorToken },
      body: JSON.stringify({ status }),
    }
  );
  return res.item;
}
