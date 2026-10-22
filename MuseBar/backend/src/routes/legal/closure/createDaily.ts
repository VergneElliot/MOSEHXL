/**
 * POST /api/legal/closure/daily
 * Daily closure bulletin creation (scoped to the authenticated user's establishment).
 */

import express from 'express';
import LegalJournalModel from '../../../models/legalJournal';
import { getEstablishmentId } from '../../auth';
import { Logger } from '../../../utils/logger';
import { AppError, asyncHandler, ValidationError } from '../../../middleware/errorHandler';
import {
  createClosureWithFailClosedJournal,
  type ClosureJournalPayload,
} from '../../../services/legal/closureCreationService';
import { parseDailyClosureMode, parseFondDeCaisse, parseForceFlag } from './parsers';

const router = express.Router();
const logger = Logger.getInstance();

router.post('/daily', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { date, force, fond_de_caisse, mode } = req.body;
    if (!date && mode !== 'close_now') {
      throw new ValidationError('Date is required (YYYY-MM-DD format)');
    }
    const fondDeCaisse = parseFondDeCaisse(fond_de_caisse);
    if (fondDeCaisse === null) {
      throw new ValidationError('fond_de_caisse is required and must be a number >= 0');
    }
    const dailyMode = parseDailyClosureMode(mode);
    const closureDate = date ? new Date(date) : new Date();
    if (isNaN(closureDate.getTime())) {
      throw new ValidationError('Invalid date format');
    }

    const forceCreate = parseForceFlag(force);
    const userId = req.user ? String(req.user.id) : undefined;
    const closure = await createClosureWithFailClosedJournal(
      establishmentId,
      'DAILY',
      forceCreate,
      userId,
      () =>
        LegalJournalModel.createDailyClosureOpen(
          closureDate,
          establishmentId,
          undefined,
          forceCreate,
          fondDeCaisse,
          dailyMode
        ) as Promise<ClosureJournalPayload>
    );

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
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to create daily closure', 500, 'LEGAL_CLOSURE_DAILY_CREATE_FAILED');
  }
}));

export default router;
