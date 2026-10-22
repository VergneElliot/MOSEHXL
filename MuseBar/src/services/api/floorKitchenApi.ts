import { request } from './core';
import { pinHeaders } from './floorApiHeaders';
import type { KitchenPrintResult } from './floorTicketTypes';

export async function printSuivreForTicket(
  ticketId: number,
  pinActorToken: string,
  itemIds?: number[]
): Promise<KitchenPrintResult> {
  return request(`/floor/tickets/${ticketId}/print-suivre`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify(itemIds?.length ? { item_ids: itemIds } : {}),
  });
}

export async function printSuivreFromCart(
  items: Array<{ product_id: number | null; product_name: string; quantity: number }>,
  pinActorToken: string,
  tableLabel?: string | null
): Promise<KitchenPrintResult> {
  return request('/floor/print-suivre', {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({ items, table_label: tableLabel ?? null }),
  });
}
