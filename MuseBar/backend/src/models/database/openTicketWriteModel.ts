import { pool } from '../../db/pool';
import type { OpenTicket } from './openTicketTypes';

export async function createOpenTicket(
  establishmentId: string,
  input: {
    dining_table_id: number;
    opened_by_user_id: number;
    covers?: number | null;
    notes?: string | null;
  }
): Promise<OpenTicket> {
  const result = await pool.query(
    `INSERT INTO open_tickets (
       establishment_id, dining_table_id, status,
       opened_by_user_id, last_served_by_user_id, covers, notes
     ) VALUES ($1, $2, 'open', $3, $3, $4, $5)
     RETURNING *`,
    [
      establishmentId,
      input.dining_table_id,
      input.opened_by_user_id,
      input.covers ?? null,
      input.notes ?? null,
    ]
  );
  return result.rows[0] as OpenTicket;
}

/** Heartbeat only — never changes `last_served_by_user_id` (ownership). */
export async function touchOpenTicketActivity(
  id: number,
  establishmentId: string
): Promise<OpenTicket | null> {
  const result = await pool.query(
    `UPDATE open_tickets
     SET updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND establishment_id = $2 AND status = 'open'
     RETURNING *`,
    [id, establishmentId]
  );
  return (result.rows[0] as OpenTicket | undefined) ?? null;
}

export async function abandonOpenTicket(
  id: number,
  establishmentId: string
): Promise<OpenTicket | null> {
  const result = await pool.query(
    `UPDATE open_tickets
     SET status = 'cancelled',
         closed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND establishment_id = $2 AND status = 'open'
     RETURNING *`,
    [id, establishmentId]
  );
  return (result.rows[0] as OpenTicket | undefined) ?? null;
}

export async function closeOpenTicketWithOrder(
  id: number,
  establishmentId: string,
  orderId: number
): Promise<OpenTicket | null> {
  const result = await pool.query(
    `UPDATE open_tickets
     SET status = 'closed',
         order_id = $3,
         closed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND establishment_id = $2 AND status = 'open'
     RETURNING *`,
    [id, establishmentId, orderId]
  );
  return (result.rows[0] as OpenTicket | undefined) ?? null;
}

/** Sole transfer of ownership (`last_served_by_user_id`) and future Z attribution. */
export async function assignOpenTicketWaiter(
  ticketId: number,
  establishmentId: string,
  waiterUserId: number
): Promise<OpenTicket | null> {
  const result = await pool.query(
    `UPDATE open_tickets
     SET last_served_by_user_id = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND establishment_id = $2 AND status = 'open'
     RETURNING *`,
    [ticketId, establishmentId, waiterUserId]
  );
  return (result.rows[0] as OpenTicket | undefined) ?? null;
}
