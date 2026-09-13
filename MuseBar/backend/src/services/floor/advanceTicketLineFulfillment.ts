import { pool } from '../../db/pool';
import type { OpenTicketItem } from '../../models/database/openTicketModel';
import type { FulfillmentStatus } from './ticketLineFulfillment';
import { resolveFulfillmentStatus } from './ticketLineFulfillment';

export async function advanceTicketLineFulfillment(input: {
  ticketId: number;
  itemId: number;
  establishmentId: string;
  target: 'sent' | 'served';
}): Promise<OpenTicketItem> {
  const { ticketId, itemId, establishmentId, target } = input;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ticket = await client.query(
      `SELECT id FROM open_tickets
       WHERE id = $1 AND establishment_id = $2 AND status = 'open'
       FOR UPDATE`,
      [ticketId, establishmentId]
    );
    if (ticket.rowCount === 0) {
      throw Object.assign(new Error('OPEN_TICKET_NOT_FOUND_OR_CLOSED'), { code: 'NOT_FOUND' });
    }

    const current = await client.query(
      `SELECT * FROM open_ticket_items
       WHERE id = $1 AND open_ticket_id = $2 AND establishment_id = $3
       FOR UPDATE`,
      [itemId, ticketId, establishmentId]
    );
    const row = current.rows[0] as
      | (OpenTicketItem & { served_at?: Date | null })
      | undefined;
    if (!row || row.line_status !== 'validated') {
      throw Object.assign(new Error('ITEM_NOT_VALIDATED'), { code: 'VALIDATION' });
    }

    const status = resolveFulfillmentStatus({
      line_status: row.line_status,
      validated_at: row.validated_at,
      kitchen_sent_at: row.kitchen_sent_at,
      served_at: row.served_at ?? null,
    });

    if (target === 'sent') {
      if (status === 'served') {
        throw Object.assign(new Error('ITEM_ALREADY_SERVED'), { code: 'VALIDATION' });
      }
      if (status === 'sent') {
        await client.query('COMMIT');
        return row;
      }
      const updated = await client.query(
        `UPDATE open_ticket_items
         SET kitchen_sent_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND open_ticket_id = $2 AND establishment_id = $3
         RETURNING *`,
        [itemId, ticketId, establishmentId]
      );
      await touchTicket(client, ticketId, establishmentId);
      await client.query('COMMIT');
      return updated.rows[0] as OpenTicketItem;
    }

    // served
    if (status === 'served') {
      await client.query('COMMIT');
      return row;
    }
    const updated = await client.query(
      `UPDATE open_ticket_items
       SET kitchen_sent_at = COALESCE(kitchen_sent_at, CURRENT_TIMESTAMP),
           served_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND open_ticket_id = $2 AND establishment_id = $3
       RETURNING *`,
      [itemId, ticketId, establishmentId]
    );
    await touchTicket(client, ticketId, establishmentId);
    await client.query('COMMIT');
    return updated.rows[0] as OpenTicketItem;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function touchTicket(
  client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  ticketId: number,
  establishmentId: string
): Promise<void> {
  await client.query(
    `UPDATE open_tickets
     SET updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND establishment_id = $2`,
    [ticketId, establishmentId]
  );
}

export function countByFulfillment(
  items: Array<{
    line_status: string;
    validated_at: Date | string | null;
    kitchen_sent_at: Date | string | null;
    served_at: Date | string | null;
  }>
): Record<FulfillmentStatus, number> {
  const counts: Record<FulfillmentStatus, number> = {
    validated: 0,
    sent: 0,
    served: 0,
  };
  for (const item of items) {
    if (item.line_status !== 'validated') continue;
    const status = resolveFulfillmentStatus(item);
    if (status === 'draft') continue;
    counts[status] += 1;
  }
  return counts;
}
