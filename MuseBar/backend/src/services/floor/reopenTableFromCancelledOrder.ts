import { ConflictError, NotFoundError, ValidationError } from '../../middleware/errorHandler';
import { pool } from '../../db/pool';
import { OpenTicketModel } from '../../models/database/openTicketModel';
import { OrderModel } from '../../models';
import { openOrReuseEmptyTicket } from './openTicketOpenService';

export type ReopenedTableResult = {
  ticket_id: number;
  table_id: number;
  table_label: string;
  item_count: number;
};

type ClosedTicketRow = {
  id: number;
  dining_table_id: number;
  covers: number | null;
  notes: string | null;
  last_served_by_user_id: number | null;
  table_label: string;
};

/**
 * After a full fiscal cancel, recreate an open ticket on the same table from the
 * closed ticket (preferred) or order lines. Does not mutate the SALE or closed ticket.
 */
export async function reopenTableFromCancelledOrder(input: {
  establishmentId: string;
  orderId: number;
  openedByUserId: number;
}): Promise<ReopenedTableResult> {
  const { establishmentId, orderId, openedByUserId } = input;
  if (!Number.isInteger(openedByUserId) || openedByUserId <= 0) {
    throw new ValidationError('openedByUserId is required to reopen a table');
  }

  const order = await OrderModel.getById(orderId, establishmentId);
  if (!order) throw new NotFoundError('Order');

  const closed = await findClosedTicketForOrder(orderId, establishmentId);
  let diningTableId: number;
  let tableLabel: string;
  let covers: number | null = null;
  let notes: string | null = null;
  let waiterUserId: number | null = order.waiter_user_id ?? null;

  if (closed) {
    diningTableId = closed.dining_table_id;
    tableLabel = closed.table_label;
    covers = closed.covers;
    notes = closed.notes;
    waiterUserId = closed.last_served_by_user_id ?? waiterUserId;
  } else {
    const label = (order.table_label ?? '').trim();
    if (!label) {
      throw new ValidationError('Cette vente n’est pas liée à une table');
    }
    const table = await resolveDiningTableByLabel(establishmentId, label);
    diningTableId = table.id;
    tableLabel = table.label;
  }

  const { ticket } = await openOrReuseEmptyTicket(establishmentId, {
    dining_table_id: diningTableId,
    opened_by_user_id: openedByUserId,
    covers,
    notes: notes ? `${notes} | Rouvert après annulation #${orderId}` : `Rouvert après annulation #${orderId}`,
  }).catch((err: unknown) => {
    if (err instanceof ConflictError) {
      throw new ConflictError(
        `La table ${tableLabel} est déjà occupée — impossible de la rouvrir automatiquement`
      );
    }
    throw err;
  });

  if (waiterUserId != null) {
    await pool.query(
      `UPDATE open_tickets
       SET last_served_by_user_id = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND establishment_id = $2 AND status = 'open'`,
      [ticket.id, establishmentId, waiterUserId]
    );
  }

  let itemCount = 0;
  if (closed) {
    itemCount = await copyLinesFromClosedTicket({
      establishmentId,
      sourceTicketId: closed.id,
      targetTicketId: ticket.id,
    });
  } else {
    itemCount = await copyLinesFromOrderItems({
      establishmentId,
      orderId,
      targetTicketId: ticket.id,
    });
  }

  if (itemCount === 0) {
    throw new ValidationError('Aucun article à restaurer sur la table');
  }

  return {
    ticket_id: ticket.id,
    table_id: diningTableId,
    table_label: tableLabel,
    item_count: itemCount,
  };
}

async function findClosedTicketForOrder(
  orderId: number,
  establishmentId: string
): Promise<ClosedTicketRow | null> {
  const result = await pool.query(
    `SELECT ot.id, ot.dining_table_id, ot.covers, ot.notes, ot.last_served_by_user_id,
            dt.label AS table_label
     FROM open_tickets ot
     INNER JOIN dining_tables dt
       ON dt.id = ot.dining_table_id AND dt.establishment_id = ot.establishment_id
     WHERE ot.establishment_id = $1
       AND ot.order_id = $2
       AND ot.status = 'closed'
     ORDER BY ot.closed_at DESC NULLS LAST, ot.id DESC
     LIMIT 1`,
    [establishmentId, orderId]
  );
  const row = result.rows[0] as ClosedTicketRow | undefined;
  return row ?? null;
}

async function resolveDiningTableByLabel(
  establishmentId: string,
  label: string
): Promise<{ id: number; label: string }> {
  const result = await pool.query(
    `SELECT id, label FROM dining_tables
     WHERE establishment_id = $1 AND label = $2
     ORDER BY id ASC
     LIMIT 2`,
    [establishmentId, label]
  );
  if (result.rowCount === 0) {
    throw new NotFoundError('Table');
  }
  if ((result.rowCount ?? 0) > 1) {
    throw new ConflictError('Plusieurs tables portent ce libellé — rouverture impossible');
  }
  const row = result.rows[0] as { id: number; label: string };
  return { id: Number(row.id), label: String(row.label) };
}

async function copyLinesFromClosedTicket(input: {
  establishmentId: string;
  sourceTicketId: number;
  targetTicketId: number;
}): Promise<number> {
  const { establishmentId, sourceTicketId, targetTicketId } = input;
  const source = await OpenTicketModel.listItems(sourceTicketId, establishmentId);
  const lines = source.filter((i) => i.line_status === 'draft' || i.line_status === 'validated');
  let sort = 0;
  for (const item of lines) {
    await pool.query(
      `INSERT INTO open_ticket_items (
         establishment_id, open_ticket_id, product_id, product_name, quantity,
         unit_price, total_price, tax_rate, tax_amount,
         happy_hour_applied, happy_hour_discount_amount, is_manual_happy_hour,
         description, options_json, kitchen_printer_ids_snapshot,
         print_pickup_slip_snapshot, sort_order, line_status, validated_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16,$17,
         'validated', CURRENT_TIMESTAMP
       )`,
      [
        establishmentId,
        targetTicketId,
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
        item.sort_order ?? sort,
      ]
    );
    sort += 1;
  }
  return lines.length;
}

async function copyLinesFromOrderItems(input: {
  establishmentId: string;
  orderId: number;
  targetTicketId: number;
}): Promise<number> {
  const { establishmentId, orderId, targetTicketId } = input;
  const result = await pool.query(
    `SELECT product_id, product_name, quantity, unit_price, total_price, tax_rate, tax_amount,
            happy_hour_applied, happy_hour_discount_amount, is_manual_happy_hour,
            description
     FROM order_items
     WHERE order_id = $1 AND establishment_id = $2
     ORDER BY id ASC`,
    [orderId, establishmentId]
  );

  let sort = 0;
  let count = 0;
  for (const row of result.rows as Array<Record<string, unknown>>) {
    const name = String(row.product_name ?? '');
    if (name.startsWith('[ANNULATION]')) continue;
    if (/pourboire/i.test(name)) continue;
    await pool.query(
      `INSERT INTO open_ticket_items (
         establishment_id, open_ticket_id, product_id, product_name, quantity,
         unit_price, total_price, tax_rate, tax_amount,
         happy_hour_applied, happy_hour_discount_amount, is_manual_happy_hour,
         description, options_json, kitchen_printer_ids_snapshot,
         print_pickup_slip_snapshot, sort_order, line_status, validated_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'[]'::jsonb,'[]'::jsonb,false,$14,
         'validated', CURRENT_TIMESTAMP
       )`,
      [
        establishmentId,
        targetTicketId,
        row.product_id != null ? Number(row.product_id) : null,
        name,
        Number(row.quantity),
        Number(row.unit_price),
        Number(row.total_price),
        Number(row.tax_rate),
        Number(row.tax_amount),
        row.happy_hour_applied === true,
        Number(row.happy_hour_discount_amount ?? 0),
        row.is_manual_happy_hour === true,
        String(row.description ?? ''),
        sort,
      ]
    );
    sort += 1;
    count += 1;
  }
  return count;
}
