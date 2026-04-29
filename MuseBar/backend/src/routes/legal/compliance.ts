/**
 * Legal Compliance Operations
 * Handles compliance checks, regulatory reporting, and fiscal requirements
 */

import express from 'express';
import LegalJournalModel from '../../models/legalJournal';
import { getEstablishmentId, requireAuth, requirePermission } from '../auth';
import { AppError, asyncHandler } from '../../middleware/errorHandler';
import { Logger } from '../../utils/logger';
import { P } from '../../permissions/registry';

const router = express.Router();
const logger = Logger.getInstance();

// All compliance routes require authentication.
router.use(requireAuth);

/**
 * GET compliance status
 * GET /api/legal/compliance/status
 */
router.get('/status', requirePermission(P.access_compliance), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const integrity = await LegalJournalModel.verifyJournalIntegrity(establishmentId);
    
    // Get recent closures
    const recentClosures = await LegalJournalModel.getClosureBulletins(establishmentId, 'DAILY');
    const today = new Date();
    const todayClosure = recentClosures.find(bulletin => {
      const bulletinDate = new Date(bulletin.period_start);
      return bulletinDate.toDateString() === today.toDateString();
    });
    
    res.json({
      compliance_status: integrity.isValid ? 'COMPLIANT' : 'NON_COMPLIANT',
      journal_integrity: integrity.isValid,
      integrity_errors: integrity.errors,
      daily_closure_status: todayClosure ? 'COMPLETED' : 'PENDING',
      fiscal_requirements: 'Article 286-I-3 bis du CGI',
      verified_at: new Date().toISOString()
    });
  } catch (error: unknown) {
    logger.error(
      'Error checking compliance status',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_COMPLIANCE'
    );
    throw new AppError('Failed to check compliance status', 500, 'LEGAL_COMPLIANCE_STATUS_FAILED');
  }
}));

/**
 * GET compliance report
 * GET /api/legal/compliance/report
 */
router.get('/report', requirePermission(P.access_compliance), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const startDate = new Date(start_date as string);
    const endDate = new Date(end_date as string);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    // Get journal entries for the period
    const entries = await LegalJournalModel.getEntriesForPeriod(establishmentId, startDate, endDate);
    
    // Get closures for the period
    const closures = await LegalJournalModel.getClosureBulletins(establishmentId);
    const periodClosures = closures.filter(bulletin => {
      const bulletinDate = new Date(bulletin.period_start);
      return bulletinDate >= startDate && bulletinDate <= endDate;
    });
    
    // Generate compliance report
    const report = {
      period: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      },
      journal_entries: {
        total: entries.length,
        sales: entries.filter(e => e.transaction_type === 'SALE').length,
        refunds: entries.filter(e => e.transaction_type === 'REFUND').length,
        corrections: entries.filter(e => e.transaction_type === 'CORRECTION').length,
        closures: entries.filter(e => e.transaction_type === 'CLOSURE').length,
        change_operations: entries.filter(e => e.transaction_type === 'CHANGE').length
      },
      closures: {
        total: periodClosures.length,
        daily: periodClosures.filter(c => c.closure_type === 'DAILY').length,
        monthly: periodClosures.filter(c => c.closure_type === 'MONTHLY').length,
        annual: periodClosures.filter(c => c.closure_type === 'ANNUAL').length
      },
      compliance_notes: [
        'Journal entries are immutable per French fiscal law',
        'Daily closures are required for regulatory compliance',
        'All transactions must be recorded in the legal journal'
      ],
      fiscal_requirements: 'Article 286-I-3 bis du CGI'
    };
    
    res.json(report);
  } catch (error: unknown) {
    logger.error(
      'Error generating compliance report',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_COMPLIANCE'
    );
    throw new AppError('Failed to generate compliance report', 500, 'LEGAL_COMPLIANCE_REPORT_FAILED');
  }
}));

/**
 * GET regulatory requirements
 * GET /api/legal/compliance/requirements
 */
router.get('/requirements', requirePermission(P.access_compliance), asyncHandler(async (_req, res) => {
  try {
    res.json({
      requirements: [
        {
          article: 'Article 286-I-3 bis du CGI',
          description: 'Obligation de conservation des données de caisse',
          requirements: [
            'Journal des opérations de caisse',
            'Bulletins de clôture quotidiens',
            'Conservation des données pendant 6 ans',
            'Intégrité des données garantie'
          ]
        },
        {
          article: 'Article L. 102 B du LPF',
          description: 'Obligation de conservation des documents comptables',
          requirements: [
            'Conservation pendant 10 ans',
            'Accessibilité des documents',
            'Intégrité des données'
          ]
        }
      ],
      compliance_notes: 'Requirements based on French fiscal law'
    });
  } catch (error: unknown) {
    logger.error(
      'Error fetching regulatory requirements',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_COMPLIANCE'
    );
    throw new AppError('Failed to fetch regulatory requirements', 500, 'LEGAL_COMPLIANCE_REQUIREMENTS_FAILED');
  }
}));

export default router; 