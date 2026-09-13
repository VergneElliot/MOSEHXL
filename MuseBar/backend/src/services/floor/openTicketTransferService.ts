import { pool } from '../../db/pool';
import type { OpenTicket } from '../../models/database/openTicketModel';
import { abandonOpenTicketIfEmpty, ticketHasActiveLines } from './openTicketEmptyCleanup';

/**
 * Move an open ticket to another table. Empty shell tickets on the target are
 * cancelled first; tickets with draft/validated lines block the transfer.
 */
export async function transferOpenTicketToTable(
  ticketId: number,
  establishmentId: string,
  newDiningTableId: number
): Promise<OpenTicket> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ticketRes = await client.query(
      `SELECT * FROM open_tickets
       WHERE id = $1 AND establishment_id = $2 AND status = 'open'
       FOR UPDATE`,
      [ticketId, establishmentId]
    );
    if (ticketRes.rowCount === 0) throw new Error('OPEN_TICKET_NOT_FOUND_OR_CLOSED');

    const tableRes = await client.query(
      `SELECT id FROM dining_tables
       WHERE id = $1 AND establishment_id = $2 AND is_active = TRUE`,
      [newDiningTableId, establishmentId]
    );
    if (tableRes.rowCount === 0) throw new Error('DINING_TABLE_NOT_FOUND');

    const targetOpen = await client.query(
      `SELECT id FROM open_tickets
       WHERE dining_table_id = $1 AND establishment_id = $2 AND status = 'open' AND id <> $3
       FOR UPDATE`,
      [newDiningTableId, establishmentId, ticketId]
    );
    if ((targetOpen.rowCount ?? 0) > 0) {
      const targetId = Number(targetOpen.rows[0].id);
      if (await ticketHasActiveLines(targetId, establishmentId, client)) {
        throw new Error('TARGET_TABLE_OCCUPIED');
      }
      await abandonOpenTicketIfEmpty(targetId, establishmentId, client);
    }

    const updated = await client.query(
      `UPDATE open_tickets
       SET dining_table_id = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND establishment_id = $2
       RETURNING *`,
      [ticketId, establishmentId, newDiningTableId]
    );
    await client.query('COMMIT');
    return updated.rows[0] as OpenTicket;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
