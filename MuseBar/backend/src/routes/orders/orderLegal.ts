/**
 * Order Legal Compliance Operations
 * Handles legal journal entries, compliance checks, and fiscal requirements
 */

import express from 'express';
import LegalJournalModel from '../../models/legalJournal';
import { OrderModel } from '../../models';
import { Logger } from '../../utils/logger';
import { getEstablishmentId, requireAuth, requireEstablishmentAdmin, requirePermission } from '../auth';
import { AppError, asyncHandler } from '../../middleware/errorHandler';
import { P } from '../../permissions/registry';

const router = express.Router();
const logger = Logger.getInstance();

/**
 * POST add legal journal entry for order
 * POST /api/orders/legal/journal-entry
 *
 * Hardening: **establishment admin only**, order must exist in the caller’s establishment,
 * and `userId` is always taken from the JWT (client-supplied `userId` in the body is ignored).
 */
router.post(
  '/journal-entry',
  requireAuth,
  requireEstablishmentAdmin,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    try {
      const { orderId, entryType, totalAmount, totalTax, paymentMethod, metadata } = req.body;

      if (!orderId || !entryType || totalAmount === undefined || totalTax === undefined) {
        return res.status(400).json({ error: 'Missing required fields for legal journal entry' });
      }

      if (typeof paymentMethod !== 'string' || !paymentMethod.trim()) {
        return res.status(400).json({ error: 'Payment method is required' });
      }

      const orderIdNum = parseInt(String(orderId), 10);
      if (!Number.isFinite(orderIdNum) || orderIdNum < 1) {
        return res.status(400).json({ error: 'Invalid order id' });
      }

      const order = await OrderModel.getById(orderIdNum, establishmentId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const amountNum = Number(totalAmount);
      const taxNum = Number(totalTax);
      if (!Number.isFinite(amountNum) || !Number.isFinite(taxNum)) {
        return res.status(400).json({ error: 'Invalid amount or tax values' });
      }

      const validEntryTypes = ['SALE', 'REFUND', 'CORRECTION', 'CLOSURE', 'ARCHIVE'] as const;
      if (!validEntryTypes.includes(entryType as (typeof validEntryTypes)[number])) {
        return res.status(400).json({ error: 'Invalid entry type' });
      }
      const entryTypeSafe = entryType as (typeof validEntryTypes)[number];

      const userId = String(req.user!.id);
      const meta =
        metadata != null && typeof metadata === 'object' && !Array.isArray(metadata)
          ? (metadata as Record<string, unknown>)
          : {};

      const journalEntry = await LegalJournalModel.addEntry(
        establishmentId,
        entryTypeSafe,
        orderIdNum,
        amountNum,
        taxNum,
        paymentMethod,
        meta,
        userId
      );

      res.status(201).json({
        message: 'Legal journal entry created successfully',
        entry: journalEntry
      });
    } catch (error: unknown) {
      logger.error(
        'Error creating legal journal entry',
        error instanceof Error ? error : new Error(String(error)),
        'ORDER_LEGAL'
      );
      throw new AppError('Failed to create legal journal entry', 500, 'ORDER_LEGAL_JOURNAL_CREATE_FAILED');
    }
  })
);

/**
 * GET verify order compliance
 * GET /api/orders/legal/compliance/:orderId
 */
router.get('/compliance/:orderId', requireAuth, requirePermission(P.access_compliance), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const integrity = await LegalJournalModel.verifyJournalIntegrity(establishmentId);
    
    res.json({
      order_id: orderId,
      compliance_status: integrity.isValid ? 'COMPLIANT' : 'NON_COMPLIANT',
      issues: integrity.errors,
      verified_at: new Date().toISOString(),
      fiscal_requirements: 'Article 286-I-3 bis du CGI',
    });
  } catch (error: unknown) {
    logger.error(
      'Error verifying order compliance',
      error instanceof Error ? error : new Error(String(error)),
      'ORDER_LEGAL'
    );
    throw new AppError('Failed to verify order compliance', 500, 'ORDER_LEGAL_COMPLIANCE_VERIFY_FAILED');
  }
}));

/**
 * GET order legal journal entries
 * GET /api/orders/legal/journal/:orderId
 */
router.get('/journal/:orderId', requireAuth, requirePermission(P.access_compliance), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const entries = await LegalJournalModel.getEntriesForOrder(establishmentId, orderId);
    
    res.json({
      order_id: orderId,
      entries,
      total_entries: entries.length,
      compliance_note: 'Journal entries are immutable per French fiscal law',
    });
  } catch (error: unknown) {
    logger.error(
      'Error fetching order journal entries',
      error instanceof Error ? error : new Error(String(error)),
      'ORDER_LEGAL'
    );
    throw new AppError('Failed to fetch journal entries', 500, 'ORDER_LEGAL_JOURNAL_FETCH_FAILED');
  }
}));

export default router;
