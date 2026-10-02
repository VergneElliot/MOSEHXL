import type { PoolClient } from 'pg';
import { pool } from '../../db/pool';

const ACTIVE_LINE_STATUSES = `line_status IN ('draft', 'validated')`;

export async function ticketHasActiveLines(
  ticketId: number,
  establishmentId: string,
  client?: PoolClient
): Promise<boolean> {
  const q = client ?? pool;
  const result = await q.query(
    `SELECT 1 FROM open_ticket_items
     WHERE open_ticket_id = $1 AND establishment_id = $2
       AND ${ACTIVE_LINE_STATUSES}
     LIMIT 1`,
    [ticketId, establishmentId]
  );
  return (result.rowCount ?? 0) > 0;
}

/** Cancel an open ticket when it has no draft/validated lines. Returns true if cancelled. */
export async function abandonOpenTicketIfEmpty(
  ticketId: number,
  establishmentId: string,
  client?: PoolClient
): Promise<boolean> {
  const hasActive = await ticketHasActiveLines(ticketId, establishmentId, client);
  if (hasActive) return false;
  const q = client ?? pool;
  const result = await q.query(
    `UPDATE open_tickets
     SET status = 'cancelled',
         closed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND establishment_id = $2 AND status = 'open'
     RETURNING id`,
    [ticketId, establishmentId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Ghost shells: `status='open'` with no draft/validated lines.
 * They look free on the floor plan but still block PIN close via last_served_by.
 */
export async function abandonEmptyOpenTicketsForWaiter(
  establishmentId: string,
  userId: number
): Promise<number> {
  const result = await pool.query(
    `UPDATE open_tickets ot
     SET status = 'cancelled',
         closed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE ot.establishment_id = $1
       AND ot.status = 'open'
       AND ot.last_served_by_user_id = $2
       AND NOT EXISTS (
         SELECT 1 FROM open_ticket_items oti
         WHERE oti.open_ticket_id = ot.id
           AND oti.establishment_id = ot.establishment_id
           AND oti.line_status IN ('draft', 'validated')
       )`,
    [establishmentId, userId]
  );
  return result.rowCount ?? 0;
}

/** Sweep all empty open shells for a venue (floor status / hygiene). */
export async function abandonAllEmptyOpenTickets(
  establishmentId: string
): Promise<number> {
  const result = await pool.query(
    `UPDATE open_tickets ot
     SET status = 'cancelled',
         closed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE ot.establishment_id = $1
       AND ot.status = 'open'
       AND NOT EXISTS (
         SELECT 1 FROM open_ticket_items oti
         WHERE oti.open_ticket_id = ot.id
           AND oti.establishment_id = ot.establishment_id
           AND oti.line_status IN ('draft', 'validated')
       )`,
    [establishmentId]
  );
  return result.rowCount ?? 0;
}
