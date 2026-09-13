import { OpenTicketModel, type OpenTicket, type OpenTicketItem } from '../../models/database/openTicketModel';
import { abandonOpenTicketIfEmpty } from './openTicketEmptyCleanup';

export async function discardDraftsClosingIfEmpty(
  ticketId: number,
  establishmentId: string
): Promise<{ ticket: OpenTicket | null; items: OpenTicketItem[] }> {
  const items = await OpenTicketModel.discardDraftItems(ticketId, establishmentId);
  if (items.length === 0) {
    await abandonOpenTicketIfEmpty(ticketId, establishmentId);
    const ticket = await OpenTicketModel.get(ticketId, establishmentId);
    return { ticket, items: [] };
  }
  const ticket = await OpenTicketModel.get(ticketId, establishmentId);
  return { ticket, items };
}

export async function abandonTicketIfNoActiveLines(
  ticketId: number,
  establishmentId: string
): Promise<boolean> {
  return abandonOpenTicketIfEmpty(ticketId, establishmentId);
}
