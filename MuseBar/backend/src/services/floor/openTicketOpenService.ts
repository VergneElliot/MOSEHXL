import { ConflictError } from '../../middleware/errorHandler';
import { OpenTicketModel, type OpenTicket, type OpenTicketItem } from '../../models/database/openTicketModel';

export async function openOrReuseEmptyTicket(
  establishmentId: string,
  input: {
    dining_table_id: number;
    opened_by_user_id: number;
    covers?: number | null;
    notes?: string | null;
  }
): Promise<{ ticket: OpenTicket; items: OpenTicketItem[]; created: boolean }> {
  const existing = await OpenTicketModel.getOpenForTable(input.dining_table_id, establishmentId);
  if (existing) {
    const items = await OpenTicketModel.listActiveItems(existing.id, establishmentId);
    if (items.length === 0) {
      return { ticket: existing, items: [], created: false };
    }
    throw new ConflictError('Table already has an open ticket');
  }

  try {
    const ticket = await OpenTicketModel.create(establishmentId, input);
    return { ticket, items: [], created: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('idx_open_tickets_one_open_per_table')) {
      throw new ConflictError('Table already has an open ticket');
    }
    throw error;
  }
}
