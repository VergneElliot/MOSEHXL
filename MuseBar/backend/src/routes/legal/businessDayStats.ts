/**
 * Live business-day stats for the History tab.
 * Uses shared aggregation (businessDayPeriod + paymentBreakdown) so totals match closure reports.
 */

import express from 'express';
import { requireAuth, getEstablishmentId } from '../auth';
import { DEFAULT_APP_TIMEZONE } from '../../config/timezone';
import { getCurrentBusinessDayPeriod } from '../../models/legalJournal/businessDayPeriod';
import { computePaymentBreakdownFromOrders } from '../../models/legalJournal/paymentBreakdown';
import { BusinessDayStatsRepository } from '../../models/legalJournal/businessDayStatsRepository';

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

    const { orders, subBills } = await BusinessDayStatsRepository.getOrdersAndSubBillsForPeriod(
      establishmentId,
      startDate,
      endDate
    );

    const { paymentBreakdown } = computePaymentBreakdownFromOrders(orders, subBills);

    const cardTotal = paymentBreakdown['card'] ?? 0;
    const cashTotal = paymentBreakdown['cash'] ?? 0;
    // CA du jour calculé depuis les commandes lues, en ignorant toute valeur NaN
    // potentiellement présente dans d'anciennes données.
    const totalTTC = orders.reduce(
      (sum: number, o: { total_amount?: string | number | null }) => {
        const v = parseFloat(String(o.total_amount ?? 0));
        return Number.isFinite(v) ? sum + v : sum;
      },
      0
    );

    const orderIds = orders.map((o: { id: number }) => o.id);
    const topProducts = await BusinessDayStatsRepository.getTopProductsForOrders(orderIds);

    res.json({
      stats: {
        total_ttc: totalTTC,
        total_sales: orders.length,
        card_total: cardTotal,
        cash_total: cashTotal,
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
