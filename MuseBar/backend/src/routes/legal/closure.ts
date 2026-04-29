/**
 * Legal Closure Operations
 * Handles daily, weekly, monthly, and annual closure bulletins
 */

import express from 'express';
import LegalJournalModel from '../../models/legalJournal';
import { getEstablishmentId, requireAuth, requirePermission } from '../auth';
import { P } from '../../permissions/registry';
import { Logger } from '../../utils/logger';
import { AppError, asyncHandler } from '../../middleware/errorHandler';

const router = express.Router();
const logger = Logger.getInstance();

type ClosureJournalPayload = {
  id?: number;
  closure_type?: string;
  total_amount?: number | string;
  total_vat?: number | string;
  period_start?: Date | string;
  period_end?: Date | string;
  closure_hash?: string;
  first_sequence?: number;
  last_sequence?: number;
};

async function appendClosureJournalEntry(
  establishmentId: string,
  closureType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL',
  closure: ClosureJournalPayload,
  forceCreate: boolean,
  userId?: string
) {
  const rawAmount =
    typeof closure.total_amount === 'number'
      ? closure.total_amount
      : parseFloat(String(closure.total_amount ?? 0));
  const rawVat =
    typeof closure.total_vat === 'number'
      ? closure.total_vat
      : parseFloat(String(closure.total_vat ?? 0));

  const totalAmount = Number.isFinite(rawAmount) ? rawAmount : 0;
  const totalVat = Number.isFinite(rawVat) ? rawVat : 0;

  try {
    await LegalJournalModel.logClosure(
      establishmentId,
      closureType,
      totalAmount,
      totalVat,
      {
        closure_bulletin_id: closure.id ?? null,
        closure_type: closureType,
        period_start: closure.period_start ?? null,
        period_end: closure.period_end ?? null,
        closure_hash: closure.closure_hash ?? null,
        first_sequence: closure.first_sequence ?? null,
        last_sequence: closure.last_sequence ?? null,
        force: forceCreate,
      },
      userId
    );
  } catch (error: unknown) {
    logger.error(
      `Legal journal closure append failed (${closureType}) for bulletin ${String(closure.id ?? 'unknown')}`,
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_JOURNAL'
    );
  }
}

function parseForceFlag(force: unknown): boolean {
  if (force === true || force === 1) return true;
  if (typeof force === 'string') {
    const normalized = force.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'yes';
  }
  return false;
}

function parseFondDeCaisse(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return n;
}

// All closure routes require authentication and clôture access.
// Closure bulletins are legally binding fiscal documents (NF 525).
router.use(requireAuth, requirePermission(P.access_closure));

/**
 * POST create daily closure bulletin (scoped to the authenticated user's establishment).
 * POST /api/legal/closure/daily
 */
router.post('/daily', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { date, force, fond_de_caisse } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'Date is required (YYYY-MM-DD format)' });
    }
    const fondDeCaisse = parseFondDeCaisse(fond_de_caisse);
    if (fondDeCaisse === null) {
      return res.status(400).json({ error: 'fond_de_caisse is required and must be a number >= 0' });
    }
    const closureDate = new Date(date);
    if (isNaN(closureDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const forceCreate = parseForceFlag(force);
    const closure = await LegalJournalModel.createDailyClosure(closureDate, establishmentId, undefined, forceCreate, fondDeCaisse);
    const userId = req.user ? String(req.user.id) : undefined;
    await appendClosureJournalEntry(establishmentId, 'DAILY', closure as ClosureJournalPayload, forceCreate, userId);

    res.status(201).json({
      ...closure,
      compliance_note: forceCreate
        ? 'Daily closure bulletin created as corrective replacement (previous bulletins kept for audit trail)'
        : 'Daily closure bulletin created per French fiscal requirements'
    });
  } catch (error) {
    logger.error(
      'Error creating daily closure',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_CLOSURE'
    );
    throw new AppError('Failed to create daily closure', 500, 'LEGAL_CLOSURE_DAILY_CREATE_FAILED');
  }
}));

/**
 * POST create weekly closure bulletin (scoped to the authenticated user's establishment).
 * POST /api/legal/closure/weekly
 */
router.post('/weekly', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { date, force, fond_de_caisse } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'Date is required (YYYY-MM-DD format)' });
    }
    const fondDeCaisse = parseFondDeCaisse(fond_de_caisse);
    if (fondDeCaisse === null) {
      return res.status(400).json({ error: 'fond_de_caisse is required and must be a number >= 0' });
    }
    const closureDate = new Date(date);
    if (isNaN(closureDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    const forceCreate = parseForceFlag(force);
    const closure = await LegalJournalModel.createWeeklyClosure(closureDate, establishmentId, forceCreate, fondDeCaisse);
    const userId = req.user ? String(req.user.id) : undefined;
    await appendClosureJournalEntry(establishmentId, 'WEEKLY', closure as ClosureJournalPayload, forceCreate, userId);
    
    res.status(201).json({
      ...closure,
      compliance_note: forceCreate
        ? 'Weekly closure bulletin created as corrective replacement (previous bulletins kept for audit trail)'
        : 'Weekly closure bulletin created per French fiscal requirements'
    });
  } catch (error) {
    logger.error(
      'Error creating weekly closure',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_CLOSURE'
    );
    throw new AppError('Failed to create weekly closure', 500, 'LEGAL_CLOSURE_WEEKLY_CREATE_FAILED');
  }
}));

/**
 * POST create monthly closure bulletin (scoped to the authenticated user's establishment).
 * POST /api/legal/closure/monthly
 */
router.post('/monthly', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { date, force, fond_de_caisse } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'Date is required (YYYY-MM-DD format)' });
    }
    const fondDeCaisse = parseFondDeCaisse(fond_de_caisse);
    if (fondDeCaisse === null) {
      return res.status(400).json({ error: 'fond_de_caisse is required and must be a number >= 0' });
    }
    const closureDate = new Date(date);
    if (isNaN(closureDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    const forceCreate = parseForceFlag(force);
    const closure = await LegalJournalModel.createMonthlyClosure(closureDate, establishmentId, forceCreate, fondDeCaisse);
    const userId = req.user ? String(req.user.id) : undefined;
    await appendClosureJournalEntry(establishmentId, 'MONTHLY', closure as ClosureJournalPayload, forceCreate, userId);
    
    res.status(201).json({
      ...closure,
      compliance_note: forceCreate
        ? 'Monthly closure bulletin created as corrective replacement (previous bulletins kept for audit trail)'
        : 'Monthly closure bulletin created per French fiscal requirements'
    });
  } catch (error) {
    logger.error(
      'Error creating monthly closure',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_CLOSURE'
    );
    throw new AppError('Failed to create monthly closure', 500, 'LEGAL_CLOSURE_MONTHLY_CREATE_FAILED');
  }
}));

/**
 * POST create annual closure bulletin (scoped to the authenticated user's establishment).
 * POST /api/legal/closure/annual
 */
router.post('/annual', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { date, force, fond_de_caisse } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'Date is required (YYYY-MM-DD format)' });
    }
    const fondDeCaisse = parseFondDeCaisse(fond_de_caisse);
    if (fondDeCaisse === null) {
      return res.status(400).json({ error: 'fond_de_caisse is required and must be a number >= 0' });
    }
    const closureDate = new Date(date);
    if (isNaN(closureDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    const forceCreate = parseForceFlag(force);
    const closure = await LegalJournalModel.createAnnualClosure(closureDate, establishmentId, forceCreate, fondDeCaisse);
    const userId = req.user ? String(req.user.id) : undefined;
    await appendClosureJournalEntry(establishmentId, 'ANNUAL', closure as ClosureJournalPayload, forceCreate, userId);
    
    res.status(201).json({
      ...closure,
      compliance_note: forceCreate
        ? 'Annual closure bulletin created as corrective replacement (previous bulletins kept for audit trail)'
        : 'Annual closure bulletin created per French fiscal requirements'
    });
  } catch (error) {
    logger.error(
      'Error creating annual closure',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_CLOSURE'
    );
    throw new AppError('Failed to create annual closure', 500, 'LEGAL_CLOSURE_ANNUAL_CREATE_FAILED');
  }
}));

/**
 * POST create closure bulletin (generic)
 * POST /api/legal/closure/create
 */
router.post('/create', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { date, type, force, fond_de_caisse } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required (YYYY-MM-DD format)' });
    }
    if (!type || !['DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL'].includes(type)) {
      return res.status(400).json({
        error: 'Valid closure type is required (DAILY, WEEKLY, MONTHLY, ANNUAL)'
      });
    }
    const closureDate = new Date(date);
    if (isNaN(closureDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const forceCreate = parseForceFlag(force);
    const fondDeCaisse = parseFondDeCaisse(fond_de_caisse);
    if (fondDeCaisse === null) {
      return res.status(400).json({ error: 'fond_de_caisse is required and must be a number >= 0' });
    }

    let closure;
    switch (type) {
      case 'DAILY':
        closure = await LegalJournalModel.createDailyClosure(closureDate, establishmentId, undefined, forceCreate, fondDeCaisse);
        break;
      case 'WEEKLY':
        closure = await LegalJournalModel.createWeeklyClosure(closureDate, establishmentId, forceCreate, fondDeCaisse);
        break;
      case 'MONTHLY':
        closure = await LegalJournalModel.createMonthlyClosure(closureDate, establishmentId, forceCreate, fondDeCaisse);
        break;
      case 'ANNUAL':
        closure = await LegalJournalModel.createAnnualClosure(closureDate, establishmentId, forceCreate, fondDeCaisse);
        break;
      default:
        return res.status(400).json({ error: 'Invalid closure type' });
    }
    const userId = req.user ? String(req.user.id) : undefined;
    await appendClosureJournalEntry(
      establishmentId,
      type as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL',
      closure as ClosureJournalPayload,
      forceCreate,
      userId
    );

    res.status(201).json({
      closure,
      compliance_note: forceCreate
        ? `${type} closure bulletin created as corrective replacement (previous bulletins kept for audit trail)`
        : `${type} closure bulletin created per French fiscal requirements`
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    logger.error(
      `Error creating ${String(req.body.type)} closure`,
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_CLOSURE'
    );
    throw new AppError(`Failed to create ${String(req.body.type)} closure`, 500, 'LEGAL_CLOSURE_CREATE_FAILED');
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

    const closureType = type as 'DAILY' | 'MONTHLY' | 'ANNUAL' | undefined;

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
      return res.status(404).json({ error: 'No monthly closure bulletin found for the current month.' });
    }

    res.json(currentMonthBulletin);
  } catch (error) {
    logger.error(
      'Error fetching latest monthly closure',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_CLOSURE'
    );
    throw new AppError('Failed to fetch latest monthly closure', 500, 'LEGAL_CLOSURE_MONTHLY_LATEST_FETCH_FAILED');
  }
}));

export default router; 