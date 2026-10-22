import type { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import type { OpenTicketItem, OpenTicketItemInput } from './openTicketTypes';
import { listActiveOpenTicketItems } from './openTicketReadModel';

/** Row lock on the open ticket; throws when it is missing or already closed. */
async function lockOpenTicket(
  client: PoolClient,
  ticketId: number,
  establishmentId: string
): Promise<void> {
  const ticket = await client.query(
    `SELECT id FROM open_tickets
     WHERE id = $1 AND establishment_id = $2 AND status = 'open'
     FOR UPDATE`,
    [ticketId, establishmentId]
  );
  if (ticket.rowCount === 0) {
    throw new Error('OPEN_TICKET_NOT_FOUND_OR_CLOSED');
  }
}

async function touchTicket(
  client: PoolClient,
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

async function insertDraftItem(
  client: PoolClient,
  establishmentId: string,
  ticketId: number,
  item: OpenTicketItemInput,
  sortOrder: number
): Promise<void> {
  await client.query(
    `INSERT INTO open_ticket_items (
       establishment_id, open_ticket_id, product_id, product_name, quantity,
       unit_price, total_price, tax_rate, tax_amount,
       happy_hour_applied, happy_hour_discount_amount, is_manual_happy_hour,
       description, options_json, kitchen_printer_ids_snapshot,
       print_pickup_slip_snapshot, sort_order, line_status
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16,$17,'draft'
     )`,
    [
      establishmentId,
      ticketId,
      item.product_id ?? null,
      item.product_name,
      item.quantity,
      item.unit_price,
      item.total_price,
      item.tax_rate,
      item.tax_amount,
      item.happy_hour_applied === true,
      item.happy_hour_discount_amount ?? 0,
      item.is_manual_happy_hour === true,
      item.description ?? '',
      JSON.stringify(item.options_json ?? []),
      JSON.stringify(item.kitchen_printer_ids_snapshot ?? []),
      item.print_pickup_slip_snapshot === true,
      sortOrder,
    ]
  );
}

/** Replace draft lines only; validated lines are preserved. */
export async function syncOpenTicketDraftItems(
  ticketId: number,
  establishmentId: string,
  draftItems: OpenTicketItemInput[]
): Promise<OpenTicketItem[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await lockOpenTicket(client, ticketId, establishmentId);

    await client.query(
      `DELETE FROM open_ticket_items
       WHERE open_ticket_id = $1 AND establishment_id = $2 AND line_status = 'draft'`,
      [ticketId, establishmentId]
    );

    const validated = await client.query(
      `SELECT COALESCE(MAX(sort_order), -1) AS max_sort
       FROM open_ticket_items
       WHERE open_ticket_id = $1 AND establishment_id = $2 AND line_status = 'validated'`,
      [ticketId, establishmentId]
    );
    const sortBase = Number(validated.rows[0]?.max_sort ?? -1) + 1;

    for (let idx = 0; idx < draftItems.length; idx += 1) {
      const item = draftItems[idx];
      if (!item) continue;
      const sortOrder = item.sort_order ?? sortBase + idx;
      await insertDraftItem(client, establishmentId, ticketId, item, sortOrder);
    }

    await touchTicket(client, ticketId, establishmentId);
    await client.query('COMMIT');
    return listActiveOpenTicketItems(ticketId, establishmentId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function validateOpenTicketDraftItems(
  ticketId: number,
  establishmentId: string,
  opts?: { lineIds?: number[] }
): Promise<{ activeItems: OpenTicketItem[]; validatedItems: OpenTicketItem[] }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await lockOpenTicket(client, ticketId, establishmentId);

    const lineIds = opts?.lineIds?.filter((id) => Number.isInteger(id) && id > 0) ?? [];
    const validated =
      lineIds.length > 0
        ? await client.query(
            `UPDATE open_ticket_items
             SET line_status = 'validated',
                 validated_at = CURRENT_TIMESTAMP
             WHERE open_ticket_id = $1 AND establishment_id = $2
               AND line_status = 'draft'
               AND id = ANY($3::int[])
             RETURNING *`,
            [ticketId, establishmentId, lineIds]
          )
        : await client.query(
            `UPDATE open_ticket_items
             SET line_status = 'validated',
                 validated_at = CURRENT_TIMESTAMP
             WHERE open_ticket_id = $1 AND establishment_id = $2 AND line_status = 'draft'
             RETURNING *`,
            [ticketId, establishmentId]
          );

    await touchTicket(client, ticketId, establishmentId);
    await client.query('COMMIT');
    const activeItems = await listActiveOpenTicketItems(ticketId, establishmentId);
    return {
      activeItems,
      validatedItems: validated.rows as OpenTicketItem[],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function discardOpenTicketDraftItems(
  ticketId: number,
  establishmentId: string
): Promise<OpenTicketItem[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await lockOpenTicket(client, ticketId, establishmentId);

    await client.query(
      `DELETE FROM open_ticket_items
       WHERE open_ticket_id = $1 AND establishment_id = $2 AND line_status = 'draft'`,
      [ticketId, establishmentId]
    );

    await touchTicket(client, ticketId, establishmentId);
    await client.query('COMMIT');
    return listActiveOpenTicketItems(ticketId, establishmentId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function cancelOpenTicketValidatedLines(
  ticketId: number,
  establishmentId: string,
  lineIds: number[]
): Promise<OpenTicketItem[]> {
  if (lineIds.length === 0) return [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await lockOpenTicket(client, ticketId, establishmentId);

    const cancelled = await client.query(
      `UPDATE open_ticket_items
       SET line_status = 'cancelled'
       WHERE open_ticket_id = $1 AND establishment_id = $2
         AND id = ANY($3::int[])
         AND line_status = 'validated'
       RETURNING *`,
      [ticketId, establishmentId, lineIds]
    );

    if ((cancelled.rowCount ?? 0) === 0) {
      throw new Error('NO_VALIDATED_LINES_TO_CANCEL');
    }

    await client.query('COMMIT');
    return cancelled.rows as OpenTicketItem[];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
