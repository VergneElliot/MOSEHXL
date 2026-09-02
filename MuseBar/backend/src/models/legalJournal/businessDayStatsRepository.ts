import { pool } from '../../db/pool';

export interface BusinessDayOrderRow {
  id: number;
  total_amount?: string | number | null;
  payment_method?: string;
  operation_type?: string;
  change_amount?: string | number | null;
  tips?: string | number | null;
}

export interface BusinessDaySubBillRow {
  order_id: number;
  payment_method: string;
  amount: string | number;
}

export interface TopProductRow {
  name: string;
  qty: number;
}

export interface TopProductByIdRow {
  product_id: number;
  name: string;
  qty: number;
}

export class BusinessDayStatsRepository {
  /**
   * Fetch orders and sub-bills for the given establishment and period.
   * Mirrors the queries in routes/legal/businessDayStats.ts.
   */
  static async getOrdersAndSubBillsForPeriod(
    establishmentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    orders: BusinessDayOrderRow[];
    subBills: BusinessDaySubBillRow[];
  }> {
    const ordersResult = await pool.query(
      `SELECT id, total_amount, payment_method, operation_type, change_amount, tips
       FROM orders
       WHERE created_at >= $1 AND created_at <= $2
         AND status IN ('completed', 'paid')
         AND establishment_id = $3
       ORDER BY created_at ASC`,
      [startDate, endDate, establishmentId]
    );

    const orders: BusinessDayOrderRow[] = ordersResult.rows;

    const splitOrderIds = orders
      .filter(o => o.payment_method === 'split')
      .map(o => o.id);

    let subBills: BusinessDaySubBillRow[] = [];
    if (splitOrderIds.length > 0) {
      const subBillsResult = await pool.query(
        'SELECT order_id, payment_method, amount FROM sub_bills WHERE order_id = ANY($1)',
        [splitOrderIds]
      );
      subBills = subBillsResult.rows;
    }

    return { orders, subBills };
  }

  /**
   * Fetch top products (name + quantity) for a set of order IDs.
   */
  static async getTopProductsForOrders(orderIds: number[]): Promise<TopProductRow[]> {
    if (orderIds.length === 0) {
      return [];
    }

    const topResult = await pool.query(
      `SELECT product_name AS name, SUM(quantity)::int AS qty
       FROM order_items
       WHERE order_id = ANY($1)
       GROUP BY product_name
       ORDER BY qty DESC
       LIMIT 10`,
      [orderIds]
    );

    return topResult.rows;
  }

  /**
   * Best sellers for an establishment (all completed/paid orders, by quantity sold).
   * Resolves product_id from product_name when legacy lines lack product_id.
   */
  static async getTopProductsForEstablishment(
    establishmentId: string,
    limit = 10
  ): Promise<TopProductByIdRow[]> {
    const capped = Math.min(50, Math.max(1, limit));
    const topResult = await pool.query(
      `WITH resolved AS (
         SELECT
           oi.quantity,
           COALESCE(
             oi.product_id,
             (
               SELECT p.id
               FROM products p
               WHERE p.establishment_id = o.establishment_id
                 AND LOWER(TRIM(p.name)) = LOWER(TRIM(oi.product_name))
               ORDER BY p.is_active DESC, p.id ASC
               LIMIT 1
             )
           ) AS product_id,
           oi.product_name
         FROM order_items oi
         INNER JOIN orders o ON o.id = oi.order_id
         WHERE o.establishment_id = $1
           AND o.status IN ('completed', 'paid')
       )
       SELECT product_id, product_name AS name, SUM(quantity)::int AS qty
       FROM resolved
       WHERE product_id IS NOT NULL
       GROUP BY product_id, product_name
       ORDER BY qty DESC, product_name ASC
       LIMIT $2`,
      [establishmentId, capped]
    );
    return topResult.rows;
  }
}

