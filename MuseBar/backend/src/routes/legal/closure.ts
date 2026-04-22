/**
 * Legal Closure Operations
 * Handles daily, weekly, monthly, and annual closure bulletins
 */

import express from 'express';
import LegalJournalModel from '../../models/legalJournal';
import { requireAuth, requirePermission } from '../auth';
import { P } from '../../permissions/registry';

const router = express.Router();

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
router.post('/daily', async (req, res) => {
  try {
    const establishmentId = req.user?.establishment_id;
    if (!establishmentId) {
      return res.status(400).json({ error: 'Closure must be scoped to an establishment. Only establishment users can create closures.' });
    }

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

    res.status(201).json({
      ...closure,
      compliance_note: forceCreate
        ? 'Daily closure bulletin created as corrective replacement (previous bulletins kept for audit trail)'
        : 'Daily closure bulletin created per French fiscal requirements'
    });
  } catch (error) {
    process.stderr.write(`Error creating daily closure: ${error instanceof Error ? error.message : String(error)}\n`);
    res.status(500).json({ error: 'Failed to create daily closure' });
  }
});

/**
 * POST create weekly closure bulletin (scoped to the authenticated user's establishment).
 * POST /api/legal/closure/weekly
 */
router.post('/weekly', async (req, res) => {
  try {
    const establishmentId = req.user?.establishment_id;
    if (!establishmentId) {
      return res.status(400).json({ error: 'Closure must be scoped to an establishment. Only establishment users can create closures.' });
    }
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
    
    res.status(201).json({
      ...closure,
      compliance_note: forceCreate
        ? 'Weekly closure bulletin created as corrective replacement (previous bulletins kept for audit trail)'
        : 'Weekly closure bulletin created per French fiscal requirements'
    });
  } catch (error) {
    process.stderr.write(`Error creating weekly closure: ${error instanceof Error ? error.message : String(error)}\n`);
    res.status(500).json({ error: 'Failed to create weekly closure' });
  }
});

/**
 * POST create monthly closure bulletin (scoped to the authenticated user's establishment).
 * POST /api/legal/closure/monthly
 */
router.post('/monthly', async (req, res) => {
  try {
    const establishmentId = req.user?.establishment_id;
    if (!establishmentId) {
      return res.status(400).json({ error: 'Closure must be scoped to an establishment. Only establishment users can create closures.' });
    }
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
    
    res.status(201).json({
      ...closure,
      compliance_note: forceCreate
        ? 'Monthly closure bulletin created as corrective replacement (previous bulletins kept for audit trail)'
        : 'Monthly closure bulletin created per French fiscal requirements'
    });
  } catch (error) {
    process.stderr.write(`Error creating monthly closure: ${error instanceof Error ? error.message : String(error)}\n`);
    res.status(500).json({ error: 'Failed to create monthly closure' });
  }
});

/**
 * POST create annual closure bulletin (scoped to the authenticated user's establishment).
 * POST /api/legal/closure/annual
 */
router.post('/annual', async (req, res) => {
  try {
    const establishmentId = req.user?.establishment_id;
    if (!establishmentId) {
      return res.status(400).json({ error: 'Closure must be scoped to an establishment. Only establishment users can create closures.' });
    }
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
    
    res.status(201).json({
      ...closure,
      compliance_note: forceCreate
        ? 'Annual closure bulletin created as corrective replacement (previous bulletins kept for audit trail)'
        : 'Annual closure bulletin created per French fiscal requirements'
    });
  } catch (error) {
    process.stderr.write(`Error creating annual closure: ${error instanceof Error ? error.message : String(error)}\n`);
    res.status(500).json({ error: 'Failed to create annual closure' });
  }
});

/**
 * POST create closure bulletin (generic)
 * POST /api/legal/closure/create
 */
router.post('/create', async (req, res) => {
  try {
    const establishmentId = req.user?.establishment_id;
    if (!establishmentId) {
      return res.status(400).json({ error: 'Closure must be scoped to an establishment. Only establishment users can create closures.' });
    }
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
    process.stderr.write(`Error creating ${String(req.body.type)} closure: ${error instanceof Error ? error.message : String(error)}\n`);
    res.status(500).json({ error: `Failed to create ${req.body.type} closure` });
  }
});

/**
 * GET closure bulletins (scoped to the authenticated user's establishment when applicable).
 * GET /api/legal/closure/bulletins
 */
router.get('/bulletins', async (req, res) => {
  try {
    const { type } = req.query;
    const establishmentId = req.user?.establishment_id ?? undefined;

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
        closureType,
        establishmentId,
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
      closureType,
      establishmentId
    );

    res.json({
      bulletins,
      total: bulletins.length,
      compliance_note: 'Closure bulletins for regulatory reporting',
    });
  } catch (error) {
    process.stderr.write(`Error fetching closure bulletins: ${error instanceof Error ? error.message : String(error)}\n`);
    res.status(500).json({ error: 'Failed to fetch closure bulletins' });
  }
});

/**
 * GET today's closure status (scoped to the user's establishment when applicable).
 * GET /api/legal/closure/today-status
 */
router.get('/today-status', async (req, res) => {
  try {
    const establishmentId = req.user?.establishment_id ?? undefined;
    const today = new Date();
    const bulletins = await LegalJournalModel.getClosureBulletins('DAILY', establishmentId);
    
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

    const lastFondDeCaisse = establishmentId ? await LegalJournalModel.getLastFondDeCaisse(establishmentId) : null;

    res.json({
      date: today.toISOString().split('T')[0],
      has_closure: !!todayBulletin,
      closure_status: todayBulletin ? 'COMPLETED' : 'PENDING',
      bulletin: bulletinWithoutTotalTransactions,
      last_fond_de_caisse: lastFondDeCaisse,
      compliance_note: 'Daily closure status for regulatory compliance'
    });
  } catch (error) {
    process.stderr.write(`Error fetching today's closure status: ${error instanceof Error ? error.message : String(error)}\n`);
    res.status(500).json({ error: 'Failed to fetch today\'s closure status' });
  }
});

/**
 * GET latest monthly closure bulletin (scoped to the user's establishment when applicable).
 * GET /api/legal/closure/monthly-latest
 */
router.get('/monthly-latest', async (req, res) => {
  try {
    const establishmentId = req.user?.establishment_id ?? undefined;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const bulletins = await LegalJournalModel.getClosureBulletins('MONTHLY', establishmentId);
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
    process.stderr.write(`Error fetching latest monthly closure: ${error instanceof Error ? error.message : String(error)}\n`);
    res.status(500).json({ error: 'Failed to fetch latest monthly closure' });
  }
});

export default router; 