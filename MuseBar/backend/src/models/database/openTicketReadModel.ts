import { pool } from '../../db/pool';
import type { OpenTicket, OpenTicketItem } from './openTicketTypes';

export async function getOpenTicket(id: number, establishmentId: string): Promise<OpenTicket | null> {
  const result = await pool.query(
    `SELECT * FROM open_tickets WHERE id = $1 AND establishment_id = $2`,
    [id, establishmentId]
  );
  return (result.rows[0] as OpenTicket | undefined) ?? null;
}

export async function getOpenTicketForTable(
  diningTableId: number,
  establishmentId: string
): Promise<OpenTicket | null> {
  const result = await pool.query(
    `SELECT * FROM open_tickets
     WHERE dining_table_id = $1 AND establishment_id = $2 AND status = 'open'`,
    [diningTableId, establishmentId]
  );
  return (result.rows[0] as OpenTicket | undefined) ?? null;
}

export async function listOpenTicketItems(
  ticketId: number,
  establishmentId: string
): Promise<OpenTicketItem[]> {
  const result = await pool.query(
    `SELECT * FROM open_ticket_items
     WHERE open_ticket_id = $1 AND establishment_id = $2
     ORDER BY sort_order ASC, id ASC`,
    [ticketId, establishmentId]
  );
  return result.rows as OpenTicketItem[];
}

export async function listActiveOpenTicketItems(
  ticketId: number,
  establishmentId: string
): Promise<OpenTicketItem[]> {
  const result = await pool.query(
    `SELECT * FROM open_ticket_items
     WHERE open_ticket_id = $1 AND establishment_id = $2
       AND line_status IN ('draft', 'validated')
     ORDER BY sort_order ASC, id ASC`,
    [ticketId, establishmentId]
  );
  return result.rows as OpenTicketItem[];
}
