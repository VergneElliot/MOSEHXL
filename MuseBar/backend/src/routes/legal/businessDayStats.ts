/**
 * Live business-day stats for the History tab.
 * Uses shared aggregation (businessDayPeriod + paymentBreakdown) so totals match closure reports.
 */

import express from 'express';
import { pool } from '../../app';
import { requireAuth, getEstablishmentId } from '../auth';
import { DEFAULT_APP_TIMEZONE } from '../../config/timezone';
import { getCurrentBusinessDayPeriod } from '../../models/legalJournal/businessDayPeriod';
import { computePaymentBreakdownFromOrders } from '../../models/legalJournal/paymentBreakdown';

const router = express.Router();
const DEFAULT_CLOSURE_TIME = '02:00';

router.use(requireAuth);

/**
 * GET /api/legal/business-day-stats
 * Returns live stats for the current business day: total TTC, transaction count,
 * card/cash breakdown (including tips and "faire de la monnaie"), and top products.
 */
router.get('/business-day-stats', async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;

  const timezone = DEFAULT_APP_TIMEZONE;
  const closureTime = DEFAULT_CLOSURE_TIME;

  try {
    const { start, end } = getCurrentBusinessDayPeriod(closureTime, timezone);
    const startDate = start.toDate();
    const endDate = end.toDate();

    const ordersResult = await pool.query(
      `SELECT id, total_amount, payment_method, operation_type, change_amount, tips
       FROM orders
       WHERE created_at >= $1 AND created_at <= $2
         AND status IN ('completed', 'paid')
         AND establishment_id = $3
       ORDER BY created_at ASC`,
      [startDate, endDate, establishmentId]
    );
    const orders = ordersResult.rows;

    const splitOrderIds = orders.filter((o: { payment_method: string }) => o.payment_method === 'split').map((o: { id: number }) => o.id);
    let subBills: Array<{ order_id: number; payment_method: string; amount: string | number }> = [];
    if (splitOrderIds.length > 0) {
      const subBillsResult = await pool.query(
        'SELECT order_id, payment_method, amount FROM sub_bills WHERE order_id = ANY($1)',
        [splitOrderIds]
      );
      subBills = subBillsResult.rows;
    }

    const { totalAmount, paymentBreakdown } = computePaymentBreakdownFromOrders(orders, subBills);

    const orderIds = orders.map((o: { id: number }) => o.id);
    let topProducts: Array<{ name: string; qty: number }> = [];
    if (orderIds.length > 0) {
      const topResult = await pool.query(
        `SELECT product_name AS name, SUM(quantity)::int AS qty
         FROM order_items
         WHERE order_id = ANY($1)
         GROUP BY product_name
         ORDER BY qty DESC
         LIMIT 10`,
        [orderIds]
      );
      topProducts = topResult.rows;
    }

    res.json({
      stats: {
        total_ttc: Math.round(totalAmount * 100) / 100,
        total_sales: orders.length,
        card_total: Math.round((paymentBreakdown['card'] ?? 0) * 100) / 100,
        cash_total: Math.round((paymentBreakdown['cash'] ?? 0) * 100) / 100,
        top_products: topProducts,
      },
      business_day_period: {
        start: start.toISOString(),
        end: end.toISOString(),
        closure_time: closureTime,
        timezone,
      },
    });
  } catch (error) {
    console.error('Error fetching business day stats:', error);
    res.status(500).json({ error: 'Failed to fetch business day statistics' });
  }
});

export default router;
