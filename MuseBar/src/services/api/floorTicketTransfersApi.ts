import { request } from './core';
import { pinHeaders } from './floorApiHeaders';
import type { OpenTicketDto, OpenTicketItemDto } from './floorTicketTypes';

export async function moveTicketLines(
  ticketId: number,
  targetDiningTableId: number,
  lineIds: number[],
  pinActorToken: string
): Promise<{
  source: OpenTicketDto;
  target: OpenTicketDto;
  target_table_label: string | null;
  served_by_display_name?: string | null;
  source_items: OpenTicketItemDto[];
  target_items: OpenTicketItemDto[];
  moved_line_ids: number[];
}> {
  return request(`/floor/tickets/${ticketId}/move-lines`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({
      target_dining_table_id: targetDiningTableId,
      line_ids: lineIds,
    }),
  });
}

export async function transferTicket(
  ticketId: number,
  diningTableId: number,
  pinActorToken: string
): Promise<{ ticket: OpenTicketDto }> {
  return request(`/floor/tickets/${ticketId}/transfer`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({ dining_table_id: diningTableId }),
  });
}

export async function mergeTickets(
  sourceTicketId: number,
  targetTicketId: number,
  pinActorToken: string
): Promise<{ source: OpenTicketDto; target: OpenTicketDto }> {
  return request(`/floor/tickets/${sourceTicketId}/merge`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({ target_ticket_id: targetTicketId }),
  });
}
