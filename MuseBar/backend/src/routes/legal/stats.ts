/**
 * Live stats endpoints for the legal/closure dashboard.
 */
import express from 'express';
import moment from 'moment-timezone';
import { requireAuth, getEstablishmentId, requireAnyPermission } from '../auth';
import { DEFAULT_APP_TIMEZONE } from '../../config/timezone';
import { MonthlyLiveStatsRepository } from '../../models/legalJournal/monthlyLiveStatsRepository';
import { Logger } from '../../utils/logger';
import { AppError, asyncHandler } from '../../middleware/errorHandler';
import { P } from '../../permissions/registry';

const router = express.Router();
const logger = Logger.getInstance();

// Matches the business-day closure time used elsewhere in the app.
const DEFAULT_CLOSURE_TIME = '02:00';

router.use(requireAuth);

/**
 * GET /api/legal/stats/monthly-live
 *
 * Monthly stats for the ongoing month:
 * - totals based on orders (not on closure bulletins)
 * - closure_count based on daily closure bulletins created within the month
 */
router.get(
  '/monthly-live',
  requireAnyPermission([P.access_closure, P.access_compliance]),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;

    try {
      const timezone = DEFAULT_APP_TIMEZONE;
      const [hours, minutes] = DEFAULT_CLOSURE_TIME.split(':').map(Number);

      const now = moment.tz(moment(), timezone);
      const monthStart = now.clone().startOf('month').set({
        hour: hours,
        minute: minutes ?? 0,
        second: 0,
        millisecond: 0,
      });
      const monthEnd = monthStart.clone().add(1, 'month').subtract(1, 'ms');

      const ordersTotals = await MonthlyLiveStatsRepository.getOrdersTotalsForPeriod({
        establishmentId,
        start: monthStart.toDate(),
        end: monthEnd.toDate(),
      });

      const { closure_count } = await MonthlyLiveStatsRepository.countDailyClosuresForPeriod({
        establishmentId,
        start: monthStart.toDate(),
        end: monthEnd.toDate(),
      });

      res.json({
        ...ordersTotals,
        closure_count,
      });
    } catch (error) {
      logger.error(
        'Error fetching monthly live stats',
        error instanceof Error ? error : new Error(String(error)),
        'LEGAL_STATS'
      );
      throw new AppError('Failed to fetch monthly live stats', 500, 'LEGAL_MONTHLY_LIVE_STATS_FAILED');
    }
  })
);

export default router;

