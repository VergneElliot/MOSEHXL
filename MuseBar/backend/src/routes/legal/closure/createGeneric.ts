/**
 * POST /api/legal/closure/create
 * Generic closure bulletin creation (scoped to the authenticated user's establishment).
 */

import express from 'express';
import LegalJournalModel from '../../../models/legalJournal';
import { getEstablishmentId } from '../../auth';
import { Logger } from '../../../utils/logger';
import { AppError, asyncHandler, ConflictError, ValidationError } from '../../../middleware/errorHandler';
import {
  createClosureWithFailClosedJournal,
  type ClosureJournalPayload,
} from '../../../services/legal/closureCreationService';
import {
  parseDailyClosureMode,
  parseFondDeCaisse,
  parseForceFlag,
  parseOptionalEmailRecipients,
} from './parsers';

const router = express.Router();
const logger = Logger.getInstance();

router.post('/create', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { date, type, force, fond_de_caisse, email_recipients, mode } = req.body;

    const dailyMode = type === 'DAILY' ? parseDailyClosureMode(mode) : 'business_day';
    if (!date && !(type === 'DAILY' && dailyMode === 'close_now')) {
      throw new ValidationError('Date is required (YYYY-MM-DD format)');
    }
    if (!type || !['DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL'].includes(type)) {
      throw new ValidationError('Valid closure type is required (DAILY, WEEKLY, MONTHLY, ANNUAL)');
    }
    const closureDate = date ? new Date(date) : new Date();
    if (isNaN(closureDate.getTime())) {
      throw new ValidationError('Invalid date format');
    }

    const forceCreate = parseForceFlag(force);
    const fondDeCaisse = parseFondDeCaisse(fond_de_caisse);
    if (fondDeCaisse === null) {
      throw new ValidationError('fond_de_caisse is required and must be a number >= 0');
    }
    const emailRecipients = parseOptionalEmailRecipients(email_recipients);

    let closureCreator!: () => Promise<ClosureJournalPayload>;
    switch (type) {
      case 'DAILY':
        closureCreator = () =>
          LegalJournalModel.createDailyClosureOpen(
            closureDate,
            establishmentId,
            undefined,
            forceCreate,
            fondDeCaisse,
            dailyMode
          ) as Promise<ClosureJournalPayload>;
        break;
      case 'WEEKLY':
        closureCreator = () =>
          LegalJournalModel.createWeeklyClosureOpen(
            closureDate,
            establishmentId,
            forceCreate,
            fondDeCaisse
          ) as Promise<ClosureJournalPayload>;
        break;
      case 'MONTHLY':
        closureCreator = () =>
          LegalJournalModel.createMonthlyClosureOpen(
            closureDate,
            establishmentId,
            forceCreate,
            fondDeCaisse
          ) as Promise<ClosureJournalPayload>;
        break;
      case 'ANNUAL':
        closureCreator = () =>
          LegalJournalModel.createAnnualClosureOpen(
            closureDate,
            establishmentId,
            forceCreate,
            fondDeCaisse
          ) as Promise<ClosureJournalPayload>;
        break;
      default:
        throw new ValidationError('Invalid closure type');
    }
    const userId = req.user ? String(req.user.id) : undefined;
    const closure = await createClosureWithFailClosedJournal(
      establishmentId,
      type as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL',
      forceCreate,
      userId,
      closureCreator,
      emailRecipients
    );

    res.status(201).json({
      closure,
      compliance_note: forceCreate
        ? `${type} closure bulletin created as corrective replacement (previous bulletins kept for audit trail)`
        : `${type} closure bulletin created per French fiscal requirements`
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw new ConflictError(error.message);
    }
    logger.error(
      `Error creating ${String(req.body.type)} closure`,
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_CLOSURE'
    );
    if (error instanceof AppError) throw error;
    throw new AppError(`Failed to create ${String(req.body.type)} closure`, 500, 'LEGAL_CLOSURE_CREATE_FAILED');
  }
}));

export default router;
