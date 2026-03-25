/**
 * Order Legal Compliance Operations
 * Handles legal journal entries, compliance checks, and fiscal requirements
 */

import express from 'express';
import LegalJournalModel from '../../models/legalJournal';
import { Logger } from '../../utils/logger';
import { requireAuth } from '../auth';

const router = express.Router();
const logger = Logger.getInstance();

/**
 * POST add legal journal entry for order
 * POST /api/orders/legal/journal-entry
 */
router.post('/journal-entry', requireAuth, async (req, res) => {
  try {
    const {
      orderId,
      entryType,
      totalAmount,
      totalTax,
      paymentMethod,
      metadata,
      userId
    } = req.body;

    if (!orderId || !entryType || totalAmount === undefined || totalTax === undefined) {
      return res.status(400).json({ error: 'Missing required fields for legal journal entry' });
    }

    const validEntryTypes = ['SALE', 'REFUND', 'CORRECTION', 'CLOSURE', 'ARCHIVE'];
    if (!validEntryTypes.includes(entryType)) {
      return res.status(400).json({ error: 'Invalid entry type' });
    }

    const journalEntry = await LegalJournalModel.addEntry(
      entryType,
      orderId,
      totalAmount,
      totalTax,
      paymentMethod,
      metadata,
      userId
    );

    res.status(201).json({
      message: 'Legal journal entry created successfully',
      entry: journalEntry
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error creating legal journal entry', error instanceof Error ? error : new Error(message), 'ORDER_LEGAL');
    res.status(500).json({ error: 'Failed to create legal journal entry', details: message });
  }
});

/**
 * GET verify order compliance
 * GET /api/orders/legal/compliance/:orderId
 */
router.get('/compliance/:orderId', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const integrity = await LegalJournalModel.verifyJournalIntegrity();
    
    res.json({
      order_id: orderId,
      compliance_status: integrity.isValid ? 'COMPLIANT' : 'NON_COMPLIANT',
      issues: integrity.errors,
      verified_at: new Date().toISOString(),
      fiscal_requirements: 'Article 286-I-3 bis du CGI',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error verifying order compliance', error instanceof Error ? error : new Error(message), 'ORDER_LEGAL');
    res.status(500).json({ error: 'Failed to verify order compliance', details: message });
  }
});

/**
 * GET order legal journal entries
 * GET /api/orders/legal/journal/:orderId
 */
router.get('/journal/:orderId', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const entries = await LegalJournalModel.getEntriesForOrder(orderId);
    
    res.json({
      order_id: orderId,
      entries,
      total_entries: entries.length,
      compliance_note: 'Journal entries are immutable per French fiscal law',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching order journal entries', error instanceof Error ? error : new Error(message), 'ORDER_LEGAL');
    res.status(500).json({ error: 'Failed to fetch journal entries', details: message });
  }
});

export default router;
