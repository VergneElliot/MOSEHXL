import { pool } from '../../db/pool';
import type { OpenTicketLineStatus } from './openTicketModel';

export type OngoingSummaryItem = {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  line_status: OpenTicketLineStatus;
  kitchen_sent_at: Date | null;
  validated_at: Date | null;
  served_at: Date | null;
};

export type OngoingSummary = {
  ticket_id: number;
  table_id: number;
  table_label: string;
  waiter_user_id: number | null;
  ticket_updated_at: Date;
  items: OngoingSummaryItem[];
};

export async function listOngoingSummaries(
  establishmentId: string
): Promise<OngoingSummary[]> {
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
       oti.validated_at,
       oti.served_at
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

  const byTicket = new Map<number, OngoingSummary>();

  for (const row of result.rows) {
    const ticketId = Number(row.ticket_id);
    let entry = byTicket.get(ticketId);
    if (!entry) {
      entry = {
        ticket_id: ticketId,
        table_id: Number(row.table_id),
        table_label: String(row.table_label),
        waiter_user_id: row.waiter_user_id != null ? Number(row.waiter_user_id) : null,
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
      served_at: (row.served_at as Date | null) ?? null,
    });
  }

  return [...byTicket.values()];
}
