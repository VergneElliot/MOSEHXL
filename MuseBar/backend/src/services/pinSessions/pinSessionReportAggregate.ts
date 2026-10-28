/**
 * Operational (non-fiscal) CA aggregate for one PIN badge session.
 * Orders linked via orders.pin_session_id; comptoir-without-PIN excluded.
 */

import { pool } from '../../db/pool';
import {
  computePaymentBreakdownFromOrders,
  type OrderRow,
  type SubBillRow,
} from '../../models/legalJournal/paymentBreakdown';
import { getExactVatBreakdownFromOrderItems } from '../../models/legalJournal/closureOperationsMath';
import type { PaymentBreakdown, VATBreakdown } from '../../models/legalJournal/types';

export type PinSessionReportSnapshot = {
  informational: true;
  pin_session_id: string;
  staff_user_id: number;
  staff_display_name: string;
  period_start: string;
  period_end: string;
  session_closed: boolean;
  order_count: number;
  total_amount: number;
  payment_breakdown: PaymentBreakdown;
  vat_breakdown: VATBreakdown;
  order_ids: number[];
};

function displayName(row: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}): string {
  const name = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim();
  return name || row.email || 'Serveur';
}

export async function aggregatePinSessionReport(
  establishmentId: string,
  pinSessionId: string
): Promise<PinSessionReportSnapshot | null> {
  const sessionResult = await pool.query(
    `SELECT s.id, s.user_id, s.opened_at, s.closed_at,
            u.first_name, u.last_name, u.email
     FROM staff_pin_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.establishment_id = $2`,
    [pinSessionId, establishmentId]
  );
  const session = sessionResult.rows[0] as
    | {
        id: string;
        user_id: number;
        opened_at: Date;
        closed_at: Date | null;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }
    | undefined;
  if (!session) return null;

  const periodStart = new Date(session.opened_at);
  const periodEnd = session.closed_at ? new Date(session.closed_at) : new Date();

  const ordersResult = await pool.query(
    `SELECT id, total_amount, payment_method, operation_type, change_amount, tips
     FROM orders
     WHERE establishment_id = $1
       AND pin_session_id = $2
       AND status IN ('completed', 'paid')
     ORDER BY id ASC`,
    [establishmentId, pinSessionId]
  );
  const orders = ordersResult.rows as OrderRow[];
  const orderIds = orders.map((o) => Number(o.id)).filter((id) => Number.isFinite(id));

  let subBills: SubBillRow[] = [];
  if (orderIds.length > 0) {
    const subResult = await pool.query(
      `SELECT order_id, payment_method, amount FROM sub_bills WHERE order_id = ANY($1)`,
      [orderIds]
    );
    subBills = subResult.rows as SubBillRow[];
  }

  const { totalAmount, paymentBreakdown } = computePaymentBreakdownFromOrders(orders, subBills);
  const vatBreakdown = await getExactVatBreakdownFromOrderItems(pool, orderIds);

  return {
    informational: true,
    pin_session_id: session.id,
    staff_user_id: Number(session.user_id),
    staff_display_name: displayName(session),
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    session_closed: session.closed_at != null,
    order_count: orderIds.length,
    total_amount: totalAmount,
    payment_breakdown: paymentBreakdown,
    vat_breakdown: vatBreakdown,
    order_ids: orderIds,
  };
}
