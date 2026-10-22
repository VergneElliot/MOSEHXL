/**
 * GET list/status routes for closure bulletins.
 */

import express from 'express';
import LegalJournalModel from '../../../models/legalJournal';
import type { ClosureType } from '../../../models/legalJournal/types';
import { getEstablishmentId } from '../../auth';
import { Logger } from '../../../utils/logger';
import { AppError, asyncHandler, NotFoundError, ValidationError } from '../../../middleware/errorHandler';
import { parseDailyClosureMode, parseForceFlag } from './parsers';

const router = express.Router();
const logger = Logger.getInstance();

/**
 * GET suggested YYYY-MM-DD for business_day mode (unclosed sales or previous day).
 * GET /api/legal/closure/suggest-business-day-date
 */
router.get('/suggest-business-day-date', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  const suggestion = await LegalJournalModel.suggestBusinessDayDate(establishmentId);
  res.json(suggestion);
}));

/**
 * GET what a daily closure would cover, without creating anything.
 * GET /api/legal/closure/daily-preview?mode=close_now|business_day&date=YYYY-MM-DD&force=
 */
router.get('/daily-preview', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;

  const mode = parseDailyClosureMode(req.query.mode);
  const dateRaw = typeof req.query.date === 'string' ? req.query.date : '';
  if (!dateRaw && mode !== 'close_now') {
    throw new ValidationError('Date is required (YYYY-MM-DD format)');
  }
  const closureDate = dateRaw ? new Date(dateRaw) : new Date();
  if (isNaN(closureDate.getTime())) {
    throw new ValidationError('Invalid date format');
  }
  const force = parseForceFlag(req.query.force);

  try {
    const preview = await LegalJournalModel.previewDailyClosure(
      closureDate,
      establishmentId,
      mode,
      force
    );
    res.json({ ok: true, ...preview });
  } catch (error) {
    // A period that cannot be resolved is a normal answer here, not a failure:
    // the dialog renders the reason so the operator can correct the date.
    res.json({
      ok: false,
      reason: error instanceof Error ? error.message : 'Période de clôture invalide',
    });
  }
}));

/**
 * GET closure bulletins (scoped to the authenticated user's establishment when applicable).
 * GET /api/legal/closure/bulletins
 */
router.get('/bulletins', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { type } = req.query;

    const limitRaw = req.query.limit;
    const offsetRaw = req.query.offset;
    const limit = typeof limitRaw === 'string' ? parseInt(limitRaw, 10) : undefined;
    const offset = typeof offsetRaw === 'string' ? parseInt(offsetRaw, 10) : undefined;

    const shouldPaginate =
      (limit != null && Number.isFinite(limit) && limit > 0) ||
      (offset != null && Number.isFinite(offset) && offset >= 0);

    const closureType = type as ClosureType | undefined;

    if (shouldPaginate) {
      const { bulletins, total } = await LegalJournalModel.getClosureBulletinsPaginated(
        establishmentId,
        closureType,
        { limit, offset }
      );

      res.json({
        bulletins,
        total,
        compliance_note: 'Closure bulletins for regulatory reporting',
      });
      return;
    }

    const bulletins = await LegalJournalModel.getClosureBulletins(
      establishmentId,
      closureType
    );

    res.json({
      bulletins,
      total: bulletins.length,
      compliance_note: 'Closure bulletins for regulatory reporting',
    });
  } catch (error) {
    logger.error(
      'Error fetching closure bulletins',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_CLOSURE'
    );
    throw new AppError('Failed to fetch closure bulletins', 500, 'LEGAL_CLOSURE_BULLETINS_FETCH_FAILED');
  }
}));

/**
 * GET today's closure status (scoped to the user's establishment when applicable).
 * GET /api/legal/closure/today-status
 */
router.get('/today-status', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const today = new Date();
    const bulletins = await LegalJournalModel.getClosureBulletins(establishmentId, 'DAILY');
    
    const todayBulletin = bulletins.find(bulletin => {
      const bulletinDate = new Date(bulletin.period_start);
      return bulletinDate.toDateString() === today.toDateString();
    });
    
      // This endpoint is only meant to power UI status/alert; we intentionally omit total_transactions
      // to remove the "transactions counter" feature from the UI.
      const bulletinWithoutTotalTransactions = todayBulletin
        ? (({ total_transactions: _ignored, ...rest }) => {
            void _ignored;
            return rest;
          })(todayBulletin as unknown as { total_transactions?: number } & Record<string, unknown>)
        : null;

    const lastFondDeCaisse = await LegalJournalModel.getLastFondDeCaisse(establishmentId);

    res.json({
      date: today.toISOString().split('T')[0],
      has_closure: !!todayBulletin,
      closure_status: todayBulletin ? 'COMPLETED' : 'PENDING',
      bulletin: bulletinWithoutTotalTransactions,
      last_fond_de_caisse: lastFondDeCaisse,
      compliance_note: 'Daily closure status for regulatory compliance'
    });
  } catch (error) {
    logger.error(
      'Error fetching today closure status',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_CLOSURE'
    );
    throw new AppError('Failed to fetch today\'s closure status', 500, 'LEGAL_CLOSURE_TODAY_STATUS_FETCH_FAILED');
  }
}));

/**
 * GET latest monthly closure bulletin (scoped to the user's establishment when applicable).
 * GET /api/legal/closure/monthly-latest
 */
router.get('/monthly-latest', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const bulletins = await LegalJournalModel.getClosureBulletins(establishmentId, 'MONTHLY');
    const currentMonthBulletin = bulletins.find(bulletin => {
      const start = new Date(bulletin.period_start);
      const end = new Date(bulletin.period_end);
      return (
        start.getFullYear() === monthStart.getFullYear() &&
        start.getMonth() === monthStart.getMonth() &&
        end.getFullYear() === monthEnd.getFullYear() &&
        end.getMonth() === monthEnd.getMonth()
      );
    });

    if (!currentMonthBulletin) {
      throw new NotFoundError('Monthly closure bulletin for the current month');
    }

    res.json(currentMonthBulletin);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(
      'Error fetching latest monthly closure',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_CLOSURE'
    );
    throw new AppError('Failed to fetch latest monthly closure', 500, 'LEGAL_CLOSURE_MONTHLY_LATEST_FETCH_FAILED');
  }
}));

export default router;
