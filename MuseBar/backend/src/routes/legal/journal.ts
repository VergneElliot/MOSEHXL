/**
 * Legal Journal Operations
 * Handles journal integrity verification, entries retrieval, and journal management
 */

import express from 'express';
import LegalJournalModel from '../../models/legalJournal';
import { Logger } from '../../utils/logger';
import { JournalQueries } from '../../models/legalJournal';
import { getEstablishmentId, requireAuth, requireAdmin } from '../auth';

const router = express.Router();
const logger = Logger.getInstance();

router.use(requireAuth);

/**
 * GET legal journal integrity verification
 * GET /api/legal/journal/verify
 */
router.get('/verify', async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const verification = await LegalJournalModel.verifyJournalIntegrity(establishmentId);
    res.json({
      integrity_status: verification.isValid ? 'VALID' : 'COMPROMISED',
      errors: verification.errors,
      verified_at: new Date().toISOString(),
      compliance: 'Article 286-I-3 bis du CGI'
    });
  } catch (error: unknown) {
    logger.error('Error verifying journal integrity', error instanceof Error ? error : new Error(String(error)), 'LEGAL_JOURNAL');
    res.status(500).json({ error: 'Failed to verify journal integrity' });
  }
});

/**
 * GET legal journal entries (read-only for auditing)
 * GET /api/legal/journal/entries
 */
router.get('/entries', async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { start_date, end_date, limit = 100, offset = 0 } = req.query;

    const parsedLimit = parseInt(limit as string);
    const parsedOffset = parseInt(offset as string);

    const result = await JournalQueries.getEntriesWithCountForPeriod({
      establishment_id: establishmentId,
      start_date: start_date as string | undefined,
      end_date: end_date as string | undefined,
      limit: parsedLimit,
      offset: parsedOffset,
    });

    res.json({
      entries: result.entries,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      compliance_note: 'Journal entries are immutable per French fiscal law',
    });
  } catch (error: unknown) {
    logger.error('Error fetching journal entries', error instanceof Error ? error : new Error(String(error)), 'LEGAL_JOURNAL');
    res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
});

/**
 * GET journal statistics
 * GET /api/legal/journal/stats
 */
router.get('/stats', requireAdmin, async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    res.json({
      statistics: await JournalQueries.getJournalStatsSummary(establishmentId),
      compliance_note: 'Journal statistics for regulatory reporting'
    });
  } catch (error: unknown) {
    logger.error('Error fetching journal statistics', error instanceof Error ? error : new Error(String(error)), 'LEGAL_JOURNAL');
    res.status(500).json({ error: 'Failed to fetch journal statistics' });
  }
});

/**
 * POST reset journal (development only)
 * POST /api/legal/journal/reset
 */
router.post('/reset', requireAdmin, async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    await JournalQueries.resetJournalDevOnly(establishmentId);
    
    res.json({
      message: 'Journal reset successfully (development only)',
    });
  } catch (error: unknown) {
    const e = error as { statusCode?: number; message?: string };
    if (e?.statusCode === 403) {
      return res.status(403).json({ error: e.message || 'Journal reset not allowed in production' });
    }
    logger.error('Error resetting journal', error instanceof Error ? error : new Error(String(error)), 'LEGAL_JOURNAL');
    res.status(500).json({ error: 'Failed to reset journal' });
  }
});

export default router;
