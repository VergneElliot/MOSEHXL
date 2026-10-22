/**
 * POST /api/legal/closure/weekly | /monthly | /annual
 * Period closure bulletin creation (scoped to the authenticated user's establishment).
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
import { parseFondDeCaisse, parseForceFlag } from './parsers';

const router = express.Router();
const logger = Logger.getInstance();

router.post('/weekly', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { date, force, fond_de_caisse } = req.body;
    if (!date) {
      throw new ValidationError('Date is required (YYYY-MM-DD format)');
    }
    const fondDeCaisse = parseFondDeCaisse(fond_de_caisse);
    if (fondDeCaisse === null) {
      throw new ValidationError('fond_de_caisse is required and must be a number >= 0');
    }
    const closureDate = new Date(date);
    if (isNaN(closureDate.getTime())) {
      throw new ValidationError('Invalid date format');
    }
    const forceCreate = parseForceFlag(force);
    const userId = req.user ? String(req.user.id) : undefined;
    const closure = await createClosureWithFailClosedJournal(
      establishmentId,
      'WEEKLY',
      forceCreate,
      userId,
      () =>
        LegalJournalModel.createWeeklyClosureOpen(
          closureDate,
          establishmentId,
          forceCreate,
          fondDeCaisse
        ) as Promise<ClosureJournalPayload>
    );
    
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
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to create weekly closure', 500, 'LEGAL_CLOSURE_WEEKLY_CREATE_FAILED');
  }
}));

router.post('/monthly', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { date, force, fond_de_caisse } = req.body;
    if (!date) {
      throw new ValidationError('Date is required (YYYY-MM-DD format)');
    }
    const fondDeCaisse = parseFondDeCaisse(fond_de_caisse);
    if (fondDeCaisse === null) {
      throw new ValidationError('fond_de_caisse is required and must be a number >= 0');
    }
    const closureDate = new Date(date);
    if (isNaN(closureDate.getTime())) {
      throw new ValidationError('Invalid date format');
    }
    const forceCreate = parseForceFlag(force);
    const userId = req.user ? String(req.user.id) : undefined;
    const closure = await createClosureWithFailClosedJournal(
      establishmentId,
      'MONTHLY',
      forceCreate,
      userId,
      () =>
        LegalJournalModel.createMonthlyClosureOpen(
          closureDate,
          establishmentId,
          forceCreate,
          fondDeCaisse
        ) as Promise<ClosureJournalPayload>
    );
    
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
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to create monthly closure', 500, 'LEGAL_CLOSURE_MONTHLY_CREATE_FAILED');
  }
}));

router.post('/annual', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { date, force, fond_de_caisse } = req.body;
    if (!date) {
      throw new ValidationError('Date is required (YYYY-MM-DD format)');
    }
    const fondDeCaisse = parseFondDeCaisse(fond_de_caisse);
    if (fondDeCaisse === null) {
      throw new ValidationError('fond_de_caisse is required and must be a number >= 0');
    }
    const closureDate = new Date(date);
    if (isNaN(closureDate.getTime())) {
      throw new ValidationError('Invalid date format');
    }
    const forceCreate = parseForceFlag(force);
    const userId = req.user ? String(req.user.id) : undefined;
    const closure = await createClosureWithFailClosedJournal(
      establishmentId,
      'ANNUAL',
      forceCreate,
      userId,
      () =>
        LegalJournalModel.createAnnualClosureOpen(
          closureDate,
          establishmentId,
          forceCreate,
          fondDeCaisse
        ) as Promise<ClosureJournalPayload>
    );
    
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
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to create annual closure', 500, 'LEGAL_CLOSURE_ANNUAL_CREATE_FAILED');
  }
}));

export default router;
