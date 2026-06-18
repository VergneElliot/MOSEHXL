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
}

