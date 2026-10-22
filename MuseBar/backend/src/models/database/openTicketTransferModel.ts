import type { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import type { OpenTicket, OpenTicketItem } from './openTicketTypes';
import { getOpenTicket } from './openTicketReadModel';

async function lockOpenTicketRow(
  client: PoolClient,
  ticketId: number,
  establishmentId: string
): Promise<OpenTicket | null> {
  const result = await client.query(
    `SELECT * FROM open_tickets
     WHERE id = $1 AND establishment_id = $2 AND status = 'open'
     FOR UPDATE`,
    [ticketId, establishmentId]
  );
  return (result.rows[0] as OpenTicket | undefined) ?? null;
}

/** Target ticket for moved lines: the open one on the table, else a new shell owned by the source waiter. */
async function resolveMoveTarget(
  client: PoolClient,
  establishmentId: string,
  source: OpenTicket,
  targetDiningTableId: number
): Promise<OpenTicket> {
  const existingTarget = await client.query(
    `SELECT * FROM open_tickets
     WHERE dining_table_id = $1 AND establishment_id = $2 AND status = 'open'
     FOR UPDATE`,
    [targetDiningTableId, establishmentId]
  );
  if ((existingTarget.rowCount ?? 0) > 0) {
    const target = existingTarget.rows[0] as OpenTicket;
    if (target.id === source.id) throw new Error('MERGE_SAME_TICKET');
    return target;
  }
  const assignedWaiter = source.last_served_by_user_id ?? source.opened_by_user_id;
  if (assignedWaiter == null) throw new Error('SOURCE_TICKET_UNASSIGNED');
  const created = await client.query(
    `INSERT INTO open_tickets (
       establishment_id, dining_table_id, status,
       opened_by_user_id, last_served_by_user_id, covers, notes
     ) VALUES ($1, $2, 'open', $3, $3, NULL, NULL)
     RETURNING *`,
    [establishmentId, targetDiningTableId, assignedWaiter]
  );
  return created.rows[0] as OpenTicket;
}

export async function moveOpenTicketLines(
  sourceTicketId: number,
  establishmentId: string,
  lineIds: number[],
  targetDiningTableId: number
): Promise<{ source: OpenTicket; target: OpenTicket; moved: OpenTicketItem[] }> {
  if (lineIds.length === 0) throw new Error('NO_LINES_TO_MOVE');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const source = await lockOpenTicketRow(client, sourceTicketId, establishmentId);
    if (!source) throw new Error('OPEN_TICKET_NOT_FOUND_OR_CLOSED');

    const tableRes = await client.query(
      `SELECT id FROM dining_tables WHERE id = $1 AND establishment_id = $2 AND is_active = TRUE`,
      [targetDiningTableId, establishmentId]
    );
    if (tableRes.rowCount === 0) throw new Error('DINING_TABLE_NOT_FOUND');

    const linesRes = await client.query(
      `SELECT * FROM open_ticket_items
       WHERE open_ticket_id = $1 AND establishment_id = $2
         AND id = ANY($3::int[])
         AND line_status IN ('draft', 'validated')`,
      [sourceTicketId, establishmentId, lineIds]
    );
    if ((linesRes.rowCount ?? 0) !== lineIds.length) {
      throw new Error('INVALID_LINE_IDS');
    }

    const target = await resolveMoveTarget(client, establishmentId, source, targetDiningTableId);

    await client.query(
      `UPDATE open_ticket_items
       SET open_ticket_id = $3
       WHERE open_ticket_id = $1 AND establishment_id = $2 AND id = ANY($4::int[])`,
      [sourceTicketId, establishmentId, target.id, lineIds]
    );

    await client.query(
      `UPDATE open_tickets SET updated_at = CURRENT_TIMESTAMP
       WHERE establishment_id = $1 AND id = ANY($2::int[])`,
      [establishmentId, [sourceTicketId, target.id]]
    );

    await client.query('COMMIT');
    const refreshedSource = await getOpenTicket(sourceTicketId, establishmentId);
    const refreshedTarget = await getOpenTicket(target.id, establishmentId);
    if (!refreshedSource || !refreshedTarget) {
      throw new Error('OPEN_TICKET_NOT_FOUND_OR_CLOSED');
    }
    return {
      source: refreshedSource,
      target: refreshedTarget,
      moved: linesRes.rows as OpenTicketItem[],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function mergeOpenTicketInto(
  sourceTicketId: number,
  targetTicketId: number,
  establishmentId: string
): Promise<{ source: OpenTicket; target: OpenTicket }> {
  if (sourceTicketId === targetTicketId) {
    throw new Error('MERGE_SAME_TICKET');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sourceRow = await lockOpenTicketRow(client, sourceTicketId, establishmentId);
    const targetRow = await lockOpenTicketRow(client, targetTicketId, establishmentId);
    if (!sourceRow || !targetRow) {
      throw new Error('OPEN_TICKET_NOT_FOUND_OR_CLOSED');
    }

    await client.query(
      `UPDATE open_ticket_items
       SET open_ticket_id = $2
       WHERE open_ticket_id = $1 AND establishment_id = $3`,
      [sourceTicketId, targetTicketId, establishmentId]
    );

    const source = await client.query(
      `UPDATE open_tickets
       SET status = 'cancelled',
           closed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND establishment_id = $2
       RETURNING *`,
      [sourceTicketId, establishmentId]
    );

    const target = await client.query(
      `UPDATE open_tickets
       SET updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND establishment_id = $2
       RETURNING *`,
      [targetTicketId, establishmentId]
    );

    await client.query('COMMIT');
    return {
      source: source.rows[0] as OpenTicket,
      target: target.rows[0] as OpenTicket,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
