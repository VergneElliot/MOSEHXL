import { request } from './core';
import type { OrderItem } from '../../types';
import { saleLines } from '../../hooks/usePOSOrderTotals';
import { pinHeaders } from './floorApiHeaders';
import { mapOrderItemToTicketPayload } from './floorTicketMappers';
import type { KitchenPrintResult, OpenTicketDto, OpenTicketItemDto } from './floorTicketTypes';

export async function openTicket(
  diningTableId: number,
  pinActorToken: string
): Promise<{ ticket: OpenTicketDto; items: OpenTicketItemDto[] }> {
  return request('/floor/tickets', {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({ dining_table_id: diningTableId }),
  });
}

export async function getTicket(
  ticketId: number
): Promise<{ ticket: OpenTicketDto; items: OpenTicketItemDto[]; served_by_display_name?: string | null }> {
  return request(`/floor/tickets/${ticketId}`);
}

/** Replaces draft lines only; validated lines are never touched by this call. */
export async function replaceTicketItems(
  ticketId: number,
  items: OrderItem[],
  pinActorToken: string
): Promise<{ ticket: OpenTicketDto; items: OpenTicketItemDto[] }> {
  const payload = saleLines(items)
    .filter((item) => item.tableLineStatus !== 'validated')
    .map((item, index) => mapOrderItemToTicketPayload(item, index));

  return request(`/floor/tickets/${ticketId}/items`, {
    method: 'PUT',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({ items: payload }),
  });
}

export async function validateTicket(
  ticketId: number,
  pinActorToken: string,
  lineIds?: number[]
): Promise<{ ticket: OpenTicketDto; items: OpenTicketItemDto[]; print: KitchenPrintResult }> {
  return request(`/floor/tickets/${ticketId}/validate`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify(lineIds?.length ? { line_ids: lineIds } : {}),
  });
}

export async function discardDraftTicketItems(
  ticketId: number,
  pinActorToken: string
): Promise<{ ticket: OpenTicketDto; items: OpenTicketItemDto[] }> {
  return request(`/floor/tickets/${ticketId}/discard-drafts`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({}),
  });
}

export async function cancelTicketLines(
  ticketId: number,
  lineIds: number[],
  pinActorToken: string
): Promise<{
  ticket: OpenTicketDto;
  items: OpenTicketItemDto[];
  print: KitchenPrintResult;
}> {
  return request(`/floor/tickets/${ticketId}/cancel-lines`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({ line_ids: lineIds }),
  });
}

export async function abandonTicket(
  ticketId: number,
  pinActorToken: string
): Promise<{ ticket: OpenTicketDto }> {
  return request(`/floor/tickets/${ticketId}/abandon`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({}),
  });
}

export async function closeTicket(
  ticketId: number,
  orderId: number,
  pinActorToken: string
): Promise<{ ticket: OpenTicketDto }> {
  return request(`/floor/tickets/${ticketId}/close`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({ order_id: orderId }),
  });
}
