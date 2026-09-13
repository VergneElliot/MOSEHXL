/**
 * Non-fiscal CA for a cut→cut business day.
 * Attributed sales (`waiter_user_id` set) group by waiter — includes PIN comptoir + table.
 * Total comptoir = unattributed sales (`waiter_user_id` null) — typically no-PIN bar caisse.
 */
import { pool } from '../../db/pool';

export type WaiterDayReportRow = {
  waiter_user_id: number | null;
  waiter_display_name: string;
  order_count: number;
  total_amount: number;
};

export type WaiterDayReportResult = {
  waiters: WaiterDayReportRow[];
  comptoir: { order_count: number; total_amount: number };
};

function mapWaiterRow(row: {
  waiter_user_id: number | null;
  waiter_display_name: string;
  order_count: number;
  total_amount: number | string;
}): WaiterDayReportRow {
  return {
    waiter_user_id: row.waiter_user_id == null ? null : Number(row.waiter_user_id),
    waiter_display_name: String(row.waiter_display_name ?? 'Sans attribution'),
    order_count: Number(row.order_count) || 0,
    total_amount:
      typeof row.total_amount === 'number'
        ? row.total_amount
        : parseFloat(String(row.total_amount ?? 0)) || 0,
  };
}

export async function queryWaiterDayReport(
  establishmentId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<WaiterDayReportResult> {
  const waiterResult = await pool.query(
    `
      SELECT
        waiter_user_id,
        COALESCE(MAX(waiter_display_name), 'Sans attribution') AS waiter_display_name,
        COUNT(*)::int AS order_count,
        COALESCE(SUM(total_amount), 0)::float AS total_amount
      FROM orders
      WHERE establishment_id = $1
        AND status IN ('completed', 'paid')
        AND created_at >= $2
        AND created_at <= $3
        AND waiter_user_id IS NOT NULL
      GROUP BY waiter_user_id
      ORDER BY total_amount DESC, waiter_display_name ASC NULLS LAST
    `,
    [establishmentId, periodStart, periodEnd]
  );

  const comptoirResult = await pool.query(
    `
      SELECT
        COUNT(*)::int AS order_count,
        COALESCE(SUM(total_amount), 0)::float AS total_amount
      FROM orders
      WHERE establishment_id = $1
        AND status IN ('completed', 'paid')
        AND created_at >= $2
        AND created_at <= $3
        AND waiter_user_id IS NULL
    `,
    [establishmentId, periodStart, periodEnd]
  );
  const c = comptoirResult.rows[0] as
    | { order_count: number; total_amount: number | string }
    | undefined;

  return {
    waiters: waiterResult.rows.map(mapWaiterRow),
    comptoir: {
      order_count: Number(c?.order_count) || 0,
      total_amount:
        typeof c?.total_amount === 'number'
          ? c.total_amount
          : parseFloat(String(c?.total_amount ?? 0)) || 0,
    },
  };
}
