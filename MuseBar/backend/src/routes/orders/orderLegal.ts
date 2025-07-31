/**
 * Order Legal Compliance Operations
 * Handles legal journal entries, compliance checks, and fiscal requirements
 */

import express from 'express';
import { LegalJournalModel } from '../../models/legalJournal';
import { requireAuth } from '../auth';

const router = express.Router();

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
  } catch (error: any) {
    console.error('Error creating legal journal entry:', error);
    res.status(500).json({ error: 'Failed to create legal journal entry', details: error.message });
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

    // For now, we'll use the general journal integrity check
    // In a full implementation, you'd have order-specific compliance checks
    const integrity = await LegalJournalModel.verifyJournalIntegrity();
    
    res.json({
      order_id: orderId,
      compliance_status: integrity.isValid ? 'COMPLIANT' : 'NON_COMPLIANT',
      issues: integrity.errors,
      verified_at: new Date().toISOString(),
      fiscal_requirements: 'Article 286-I-3 bis du CGI',
      note: 'Order-specific compliance checks to be implemented'
    });
  } catch (error: any) {
    console.error('Error verifying order compliance:', error);
    res.status(500).json({ error: 'Failed to verify order compliance', details: error.message });
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

    // For now, we'll get entries for the current day
    // In a full implementation, you'd query by order_id
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const entries = await LegalJournalModel.getEntriesForPeriod(startOfDay, endOfDay);
    const orderEntries = entries.filter(entry => entry.order_id === orderId);
    
    res.json({
      order_id: orderId,
      entries: orderEntries,
      total_entries: orderEntries.length,
      compliance_note: 'Journal entries are immutable per French fiscal law',
      note: 'Order-specific journal queries to be implemented'
    });
  } catch (error: any) {
    console.error('Error fetching order journal entries:', error);
    res.status(500).json({ error: 'Failed to fetch journal entries', details: error.message });
  }
});

export default router; 