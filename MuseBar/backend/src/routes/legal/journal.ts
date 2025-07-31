/**
 * Legal Journal Operations
 * Handles journal integrity verification, entries retrieval, and journal management
 */

import express from 'express';
import { LegalJournalModel } from '../../models/legalJournal';
import { pool } from '../../app';
import { requireAuth, requireAdmin } from '../auth';

const router = express.Router();

/**
 * GET legal journal integrity verification
 * GET /api/legal/journal/verify
 */
router.get('/verify', async (req, res) => {
  try {
    const verification = await LegalJournalModel.verifyJournalIntegrity();
    res.json({
      integrity_status: verification.isValid ? 'VALID' : 'COMPROMISED',
      errors: verification.errors,
      verified_at: new Date().toISOString(),
      compliance: 'Article 286-I-3 bis du CGI'
    });
  } catch (error) {
    console.error('Error verifying journal integrity:', error);
    res.status(500).json({ error: 'Failed to verify journal integrity' });
  }
});

/**
 * GET legal journal entries (read-only for auditing)
 * GET /api/legal/journal/entries
 */
router.get('/entries', async (req, res) => {
  try {
    const { start_date, end_date, limit = 100, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM legal_journal ORDER BY sequence_number DESC';
    const values: any[] = [];
    
    if (start_date && end_date) {
      query = `
        SELECT * FROM legal_journal 
        WHERE timestamp >= $1 AND timestamp <= $2 
        ORDER BY sequence_number DESC
      `;
      values.push(start_date, end_date);
    }
    
    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await pool.query(query, values);
    
    // Get total count for pagination
    const countQuery = start_date && end_date 
      ? 'SELECT COUNT(*) FROM legal_journal WHERE timestamp >= $1 AND timestamp <= $2'
      : 'SELECT COUNT(*) FROM legal_journal';
    const countValues = start_date && end_date ? [start_date, end_date] : [];
    const countResult = await pool.query(countQuery, countValues);
    
    res.json({
      entries: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      compliance_note: 'Journal entries are immutable per French fiscal law'
    });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
});

/**
 * GET journal statistics
 * GET /api/legal/journal/stats
 */
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_entries,
        MIN(sequence_number) as first_sequence,
        MAX(sequence_number) as last_sequence,
        MIN(timestamp) as first_entry_date,
        MAX(timestamp) as last_entry_date,
        SUM(CASE WHEN transaction_type = 'SALE' THEN 1 ELSE 0 END) as sales_count,
        SUM(CASE WHEN transaction_type = 'REFUND' THEN 1 ELSE 0 END) as refunds_count,
        SUM(CASE WHEN transaction_type = 'CORRECTION' THEN 1 ELSE 0 END) as corrections_count,
        SUM(CASE WHEN transaction_type = 'CLOSURE' THEN 1 ELSE 0 END) as closures_count
      FROM legal_journal
    `;
    
    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];
    
    res.json({
      statistics: stats,
      compliance_note: 'Journal statistics for regulatory reporting'
    });
  } catch (error) {
    console.error('Error fetching journal statistics:', error);
    res.status(500).json({ error: 'Failed to fetch journal statistics' });
  }
});

/**
 * POST reset journal (development only)
 * POST /api/legal/journal/reset
 */
router.post('/reset', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Journal reset not allowed in production' });
    }
    
    const resetQuery = 'DELETE FROM legal_journal';
    await pool.query(resetQuery);
    
    // Reset sequence
    const resetSequenceQuery = 'ALTER SEQUENCE legal_journal_id_seq RESTART WITH 1';
    await pool.query(resetSequenceQuery);
    
    res.json({
      message: 'Journal reset successfully (development only)',
      note: 'This operation is only allowed in development environment'
    });
  } catch (error) {
    console.error('Error resetting journal:', error);
    res.status(500).json({ error: 'Failed to reset journal' });
  }
});

export default router; 