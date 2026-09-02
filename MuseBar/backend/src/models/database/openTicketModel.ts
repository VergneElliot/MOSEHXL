import { pool } from '../../db/pool';

export type OpenTicketStatus = 'open' | 'closed' | 'cancelled';

export interface OpenTicket {
  id: number;
  establishment_id: string;
  dining_table_id: number;
  status: OpenTicketStatus;
  opened_by_user_id: number | null;
  last_served_by_user_id: number | null;
  covers: number | null;
  notes: string | null;
  order_id: number | null;
  created_at: Date;
  updated_at: Date;
  closed_at: Date | null;
}

export type OpenTicketLineStatus = 'draft' | 'validated' | 'cancelled';

export interface OpenTicketItemInput {
  product_id?: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  happy_hour_applied?: boolean;
  happy_hour_discount_amount?: number;
  is_manual_happy_hour?: boolean;
  description?: string;
  options_json?: unknown;
  kitchen_printer_ids_snapshot?: unknown;
  print_pickup_slip_snapshot?: boolean;
  sort_order?: number;
}

export interface OpenTicketItem extends OpenTicketItemInput {
  id: number;
  establishment_id: string;
  open_ticket_id: number;
  line_status: OpenTicketLineStatus;
  validated_at: Date | null;
  kitchen_sent_at: Date | null;
  created_at: Date;
}

export const OpenTicketModel = {
  async get(id: number, establishmentId: string): Promise<OpenTicket | null> {
    const result = await pool.query(
      `SELECT * FROM open_tickets WHERE id = $1 AND establishment_id = $2`,
      [id, establishmentId]
    );
    return (result.rows[0] as OpenTicket | undefined) ?? null;
  },

  async getOpenForTable(
    diningTableId: number,
    establishmentId: string
  ): Promise<OpenTicket | null> {
    const result = await pool.query(
      `SELECT * FROM open_tickets
       WHERE dining_table_id = $1 AND establishment_id = $2 AND status = 'open'`,
      [diningTableId, establishmentId]
    );
    return (result.rows[0] as OpenTicket | undefined) ?? null;
  },

  async create(
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
  },

  async touchServer(
    id: number,
    establishmentId: string,
    lastServedByUserId: number
  ): Promise<OpenTicket | null> {
    const result = await pool.query(
      `UPDATE open_tickets
       SET last_served_by_user_id = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND establishment_id = $2 AND status = 'open'
       RETURNING *`,
      [id, establishmentId, lastServedByUserId]
    );
    return (result.rows[0] as OpenTicket | undefined) ?? null;
  },

  async abandon(
    id: number,
    establishmentId: string,
    lastServedByUserId: number
  ): Promise<OpenTicket | null> {
    const result = await pool.query(
      `UPDATE open_tickets
       SET status = 'cancelled',
           last_served_by_user_id = $3,
           closed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND establishment_id = $2 AND status = 'open'
       RETURNING *`,
      [id, establishmentId, lastServedByUserId]
    );
    return (result.rows[0] as OpenTicket | undefined) ?? null;
  },

  async closeWithOrder(
    id: number,
    establishmentId: string,
    orderId: number,
    _lastServedByUserId: number
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
  },

  async listItems(ticketId: number, establishmentId: string): Promise<OpenTicketItem[]> {
    const result = await pool.query(
      `SELECT * FROM open_ticket_items
       WHERE open_ticket_id = $1 AND establishment_id = $2
       ORDER BY sort_order ASC, id ASC`,
      [ticketId, establishmentId]
    );
    return result.rows as OpenTicketItem[];
  },

  async listActiveItems(ticketId: number, establishmentId: string): Promise<OpenTicketItem[]> {
    const result = await pool.query(
      `SELECT * FROM open_ticket_items
       WHERE open_ticket_id = $1 AND establishment_id = $2
         AND line_status IN ('draft', 'validated')
       ORDER BY sort_order ASC, id ASC`,
      [ticketId, establishmentId]
    );
    return result.rows as OpenTicketItem[];
  },

  /** Replace draft lines only; validated lines are preserved. */
  async syncDraftItems(
    ticketId: number,
    establishmentId: string,
    draftItems: OpenTicketItemInput[]
  ): Promise<OpenTicketItem[]> {
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
        throw new Error('OPEN_TICKET_NOT_FOUND_OR_CLOSED');
      }

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
      let sortBase = Number(validated.rows[0]?.max_sort ?? -1) + 1;

      for (let idx = 0; idx < draftItems.length; idx += 1) {
        const item = draftItems[idx]!;
        const sortOrder = item.sort_order ?? sortBase + idx;
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

      await client.query(
        `UPDATE open_tickets
         SET updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND establishment_id = $2`,
        [ticketId, establishmentId]
      );

      await client.query('COMMIT');
      return this.listActiveItems(ticketId, establishmentId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async validateDraftItems(
    ticketId: number,
    establishmentId: string,
    opts?: { lineIds?: number[] }
  ): Promise<{ activeItems: OpenTicketItem[]; validatedItems: OpenTicketItem[] }> {
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
        throw new Error('OPEN_TICKET_NOT_FOUND_OR_CLOSED');
      }

      const lineIds = opts?.lineIds?.filter((id) => Number.isInteger(id) && id > 0) ?? [];
      const validated =
        lineIds.length > 0
          ? await client.query(
              `UPDATE open_ticket_items
               SET line_status = 'validated',
                   validated_at = CURRENT_TIMESTAMP,
                   kitchen_sent_at = CURRENT_TIMESTAMP
               WHERE open_ticket_id = $1 AND establishment_id = $2
                 AND line_status = 'draft'
                 AND id = ANY($3::int[])
               RETURNING *`,
              [ticketId, establishmentId, lineIds]
            )
          : await client.query(
              `UPDATE open_ticket_items
               SET line_status = 'validated',
                   validated_at = CURRENT_TIMESTAMP,
                   kitchen_sent_at = CURRENT_TIMESTAMP
               WHERE open_ticket_id = $1 AND establishment_id = $2 AND line_status = 'draft'
               RETURNING *`,
              [ticketId, establishmentId]
            );

      await client.query(
        `UPDATE open_tickets
         SET updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND establishment_id = $2`,
        [ticketId, establishmentId]
      );

      await client.query('COMMIT');
      const activeItems = await this.listActiveItems(ticketId, establishmentId);
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
  },

  async discardDraftItems(
    ticketId: number,
    establishmentId: string
  ): Promise<OpenTicketItem[]> {
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
        throw new Error('OPEN_TICKET_NOT_FOUND_OR_CLOSED');
      }

      await client.query(
        `DELETE FROM open_ticket_items
         WHERE open_ticket_id = $1 AND establishment_id = $2 AND line_status = 'draft'`,
        [ticketId, establishmentId]
      );

      await client.query(
        `UPDATE open_tickets
         SET updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND establishment_id = $2`,
        [ticketId, establishmentId]
      );

      await client.query('COMMIT');
      return this.listActiveItems(ticketId, establishmentId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async cancelValidatedLines(
    ticketId: number,
    establishmentId: string,
    lineIds: number[]
  ): Promise<OpenTicketItem[]> {
    if (lineIds.length === 0) return [];
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
        throw new Error('OPEN_TICKET_NOT_FOUND_OR_CLOSED');
      }

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
  },

  async moveLines(
    sourceTicketId: number,
    establishmentId: string,
    lineIds: number[],
    targetDiningTableId: number
  ): Promise<{ source: OpenTicket; target: OpenTicket; moved: OpenTicketItem[] }> {
    if (lineIds.length === 0) throw new Error('NO_LINES_TO_MOVE');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const sourceRes = await client.query(
        `SELECT * FROM open_tickets
         WHERE id = $1 AND establishment_id = $2 AND status = 'open'
         FOR UPDATE`,
        [sourceTicketId, establishmentId]
      );
      if (sourceRes.rowCount === 0) throw new Error('OPEN_TICKET_NOT_FOUND_OR_CLOSED');
      const source = sourceRes.rows[0] as OpenTicket;

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

      const existingTarget = await client.query(
        `SELECT * FROM open_tickets
         WHERE dining_table_id = $1 AND establishment_id = $2 AND status = 'open'
         FOR UPDATE`,
        [targetDiningTableId, establishmentId]
      );
      let target: OpenTicket;
      if ((existingTarget.rowCount ?? 0) > 0) {
        target = existingTarget.rows[0] as OpenTicket;
        if (target.id === sourceTicketId) throw new Error('MERGE_SAME_TICKET');
      } else {
        const assignedWaiter =
          source.last_served_by_user_id ?? source.opened_by_user_id;
        if (assignedWaiter == null) throw new Error('SOURCE_TICKET_UNASSIGNED');
        const created = await client.query(
          `INSERT INTO open_tickets (
             establishment_id, dining_table_id, status,
             opened_by_user_id, last_served_by_user_id, covers, notes
           ) VALUES ($1, $2, 'open', $3, $3, NULL, NULL)
           RETURNING *`,
          [establishmentId, targetDiningTableId, assignedWaiter]
        );
        target = created.rows[0] as OpenTicket;
      }

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
      const refreshedSource = (await this.get(sourceTicketId, establishmentId))!;
      const refreshedTarget = (await this.get(target.id, establishmentId))!;
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
  },

  async replaceItems(
    ticketId: number,
    establishmentId: string,
    items: OpenTicketItemInput[]
  ): Promise<OpenTicketItem[]> {
    return this.syncDraftItems(ticketId, establishmentId, items);
  },

  async transferTable(
    ticketId: number,
    establishmentId: string,
    newDiningTableId: number,
    _actorUserId: number
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
        `SELECT id FROM dining_tables WHERE id = $1 AND establishment_id = $2 AND is_active = TRUE`,
        [newDiningTableId, establishmentId]
      );
      if (tableRes.rowCount === 0) throw new Error('DINING_TABLE_NOT_FOUND');
      const occupied = await client.query(
        `SELECT id FROM open_tickets
         WHERE dining_table_id = $1 AND establishment_id = $2 AND status = 'open' AND id <> $3`,
        [newDiningTableId, establishmentId, ticketId]
      );
      if ((occupied.rowCount || 0) > 0) throw new Error('TARGET_TABLE_OCCUPIED');
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
  },

  async takeover(
    ticketId: number,
    establishmentId: string,
    actorUserId: number
  ): Promise<OpenTicket | null> {
    return OpenTicketModel.assignWaiter(ticketId, establishmentId, actorUserId);
  },

  async assignWaiter(
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
  },

  async mergeInto(
    sourceTicketId: number,
    targetTicketId: number,
    establishmentId: string,
    _actorUserId: number
  ): Promise<{ source: OpenTicket; target: OpenTicket }> {
    if (sourceTicketId === targetTicketId) {
      throw new Error('MERGE_SAME_TICKET');
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const sourceRes = await client.query(
        `SELECT * FROM open_tickets
         WHERE id = $1 AND establishment_id = $2 AND status = 'open'
         FOR UPDATE`,
        [sourceTicketId, establishmentId]
      );
      const targetRes = await client.query(
        `SELECT * FROM open_tickets
         WHERE id = $1 AND establishment_id = $2 AND status = 'open'
         FOR UPDATE`,
        [targetTicketId, establishmentId]
      );
      if (sourceRes.rowCount === 0 || targetRes.rowCount === 0) {
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
  },

  async listOngoingSummaries(establishmentId: string): Promise<
    Array<{
      ticket_id: number;
      table_id: number;
      table_label: string;
      waiter_user_id: number | null;
      ticket_updated_at: Date;
      items: Array<{
        id: number;
        product_name: string;
        quantity: number;
        unit_price: number;
        total_price: number;
        line_status: OpenTicketLineStatus;
        kitchen_sent_at: Date | null;
        validated_at: Date | null;
      }>;
    }>
  > {
    const result = await pool.query(
      `SELECT
         ot.id AS ticket_id,
         ot.dining_table_id AS table_id,
         dt.label AS table_label,
         ot.last_served_by_user_id AS waiter_user_id,
         ot.updated_at AS ticket_updated_at,
         oti.id AS item_id,
         oti.product_name,
         oti.quantity,
         oti.unit_price,
         oti.total_price,
         oti.line_status,
         oti.kitchen_sent_at,
         oti.validated_at
       FROM open_tickets ot
       INNER JOIN dining_tables dt ON dt.id = ot.dining_table_id AND dt.establishment_id = ot.establishment_id
       INNER JOIN open_ticket_items oti
         ON oti.open_ticket_id = ot.id AND oti.establishment_id = ot.establishment_id
       WHERE ot.establishment_id = $1
         AND ot.status = 'open'
         AND oti.line_status IN ('draft', 'validated')
       ORDER BY ot.updated_at DESC, oti.sort_order ASC, oti.id ASC`,
      [establishmentId]
    );

    const byTicket = new Map<
      number,
      {
        ticket_id: number;
        table_id: number;
        table_label: string;
        waiter_user_id: number | null;
        ticket_updated_at: Date;
        items: Array<{
          id: number;
          product_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          line_status: OpenTicketLineStatus;
          kitchen_sent_at: Date | null;
          validated_at: Date | null;
        }>;
      }
    >();

    for (const row of result.rows) {
      const ticketId = Number(row.ticket_id);
      let entry = byTicket.get(ticketId);
      if (!entry) {
        entry = {
          ticket_id: ticketId,
          table_id: Number(row.table_id),
          table_label: String(row.table_label),
          waiter_user_id:
            row.waiter_user_id != null ? Number(row.waiter_user_id) : null,
          ticket_updated_at: row.ticket_updated_at as Date,
          items: [],
        };
        byTicket.set(ticketId, entry);
      }
      entry.items.push({
        id: Number(row.item_id),
        product_name: String(row.product_name),
        quantity: Number(row.quantity),
        unit_price: Number(row.unit_price),
        total_price: Number(row.total_price),
        line_status: row.line_status as OpenTicketLineStatus,
        kitchen_sent_at: (row.kitchen_sent_at as Date | null) ?? null,
        validated_at: (row.validated_at as Date | null) ?? null,
      });
    }

    return [...byTicket.values()];
  },
};
