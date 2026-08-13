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
    lastServedByUserId: number
  ): Promise<OpenTicket | null> {
    const result = await pool.query(
      `UPDATE open_tickets
       SET status = 'closed',
           order_id = $3,
           last_served_by_user_id = $4,
           closed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND establishment_id = $2 AND status = 'open'
       RETURNING *`,
      [id, establishmentId, orderId, lastServedByUserId]
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

  async replaceItems(
    ticketId: number,
    establishmentId: string,
    items: OpenTicketItemInput[],
    lastServedByUserId: number
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
        `DELETE FROM open_ticket_items WHERE open_ticket_id = $1 AND establishment_id = $2`,
        [ticketId, establishmentId]
      );

      const created: OpenTicketItem[] = [];
      for (let idx = 0; idx < items.length; idx += 1) {
        const item = items[idx]!;
        const insert = await client.query(
          `INSERT INTO open_ticket_items (
             establishment_id, open_ticket_id, product_id, product_name, quantity,
             unit_price, total_price, tax_rate, tax_amount,
             happy_hour_applied, happy_hour_discount_amount, is_manual_happy_hour,
             description, options_json, kitchen_printer_ids_snapshot,
             print_pickup_slip_snapshot, sort_order
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16,$17
           ) RETURNING *`,
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
            item.sort_order ?? idx,
          ]
        );
        created.push(insert.rows[0] as OpenTicketItem);
      }

      await client.query(
        `UPDATE open_tickets
         SET last_served_by_user_id = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND establishment_id = $2`,
        [ticketId, establishmentId, lastServedByUserId]
      );

      await client.query('COMMIT');
      return created;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};
