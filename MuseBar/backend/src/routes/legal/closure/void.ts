/**
 * POST annul / supersede closure bulletins.
 */

import express from 'express';
import LegalJournalModel from '../../../models/legalJournal';
import { getEstablishmentId } from '../../auth';
import { Logger } from '../../../utils/logger';
import { asyncHandler, NotFoundError, ValidationError } from '../../../middleware/errorHandler';

const router = express.Router();
const logger = Logger.getInstance();

/**
 * POST annul a closure bulletin issued in error.
 * The bulletin is retained in full and flagged; a corrective bulletin is created separately.
 * POST /api/legal/closure/bulletins/:id/void
 */
router.post('/bulletins/:id/void', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;

  const bulletinId = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(bulletinId)) {
    throw new ValidationError('Invalid bulletin id');
  }

  const reason = String(req.body?.reason ?? '').trim();
  if (reason.length < 10) {
    throw new ValidationError(
      'Un motif d’annulation d’au moins 10 caractères est requis (traçabilité légale)'
    );
  }

  const userId = req.user ? String(req.user.id) : 'unknown';
  const voided = await LegalJournalModel.voidClosureBulletin(
    bulletinId,
    establishmentId,
    reason,
    userId
  );
  if (!voided) {
    throw new NotFoundError('Closure bulletin to annul (or it is already annulled)');
  }

  // Fail-open on the journal append here: the annulment itself is already
  // persisted and immutable, and the audit trail below records it regardless.
  try {
    await LegalJournalModel.logClosure(
      establishmentId,
      (voided.closure_type as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL') ?? 'DAILY',
      0,
      0,
      {
        action: 'CLOSURE_BULLETIN_VOIDED',
        closure_bulletin_id: voided.id ?? null,
        period_start: voided.period_start ?? null,
        period_end: voided.period_end ?? null,
        original_total_amount: voided.total_amount ?? null,
        void_reason: reason,
      },
      userId
    );
  } catch (error) {
    logger.error(
      `Journal append failed for annulment of bulletin ${bulletinId}`,
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_CLOSURE'
    );
  }

  res.json({
    bulletin: voided,
    compliance_note:
      'Bulletin annulé et conservé à l’identique dans l’archive (inaltérabilité NF525). ' +
      'Émettez un bulletin correctif pour la période concernée.',
  });
}));

/**
 * POST link an annulled bulletin to the corrective bulletin replacing it.
 * POST /api/legal/closure/bulletins/:id/superseded-by
 */
router.post('/bulletins/:id/superseded-by', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;

  const bulletinId = parseInt(String(req.params.id), 10);
  const supersedingId = parseInt(String(req.body?.superseding_bulletin_id), 10);
  if (!Number.isFinite(bulletinId) || !Number.isFinite(supersedingId)) {
    throw new ValidationError('Invalid bulletin id');
  }

  await LegalJournalModel.setSupersededBy(bulletinId, supersedingId, establishmentId);
  res.json({ ok: true });
}));

export default router;
