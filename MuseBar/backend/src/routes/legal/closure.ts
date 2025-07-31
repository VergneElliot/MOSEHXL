/**
 * Legal Closure Operations
 * Handles daily, weekly, monthly, and annual closure bulletins
 */

import express from 'express';
import { LegalJournalModel } from '../../models/legalJournal';
import { requireAuth, requireAdmin } from '../auth';

const router = express.Router();

/**
 * POST create daily closure bulletin
 * POST /api/legal/closure/daily
 */
router.post('/daily', async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required (YYYY-MM-DD format)' });
    }
    
    const closureDate = new Date(date);
    if (isNaN(closureDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    const closure = await LegalJournalModel.createDailyClosure(closureDate);
    
    res.status(201).json({
      ...closure,
      compliance_note: 'Daily closure bulletin created per French fiscal requirements'
    });
  } catch (error) {
    console.error('Error creating daily closure:', error);
    res.status(500).json({ error: 'Failed to create daily closure' });
  }
});

/**
 * POST create weekly closure bulletin
 * POST /api/legal/closure/weekly
 */
router.post('/weekly', async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required (YYYY-MM-DD format)' });
    }
    
    const closureDate = new Date(date);
    if (isNaN(closureDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    const closure = await LegalJournalModel.createWeeklyClosure(closureDate);
    
    res.status(201).json({
      ...closure,
      compliance_note: 'Weekly closure bulletin created per French fiscal requirements'
    });
  } catch (error) {
    console.error('Error creating weekly closure:', error);
    res.status(500).json({ error: 'Failed to create weekly closure' });
  }
});

/**
 * POST create monthly closure bulletin
 * POST /api/legal/closure/monthly
 */
router.post('/monthly', async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required (YYYY-MM-DD format)' });
    }
    
    const closureDate = new Date(date);
    if (isNaN(closureDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    const closure = await LegalJournalModel.createMonthlyClosure(closureDate);
    
    res.status(201).json({
      ...closure,
      compliance_note: 'Monthly closure bulletin created per French fiscal requirements'
    });
  } catch (error) {
    console.error('Error creating monthly closure:', error);
    res.status(500).json({ error: 'Failed to create monthly closure' });
  }
});

/**
 * POST create annual closure bulletin
 * POST /api/legal/closure/annual
 */
router.post('/annual', async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required (YYYY-MM-DD format)' });
    }
    
    const closureDate = new Date(date);
    if (isNaN(closureDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    const closure = await LegalJournalModel.createAnnualClosure(closureDate);
    
    res.status(201).json({
      ...closure,
      compliance_note: 'Annual closure bulletin created per French fiscal requirements'
    });
  } catch (error) {
    console.error('Error creating annual closure:', error);
    res.status(500).json({ error: 'Failed to create annual closure' });
  }
});

/**
 * GET closure bulletins
 * GET /api/legal/closure/bulletins
 */
router.get('/bulletins', async (req, res) => {
  try {
    const { type } = req.query;
    
    const bulletins = await LegalJournalModel.getClosureBulletins(
      type as 'DAILY' | 'MONTHLY' | 'ANNUAL' | undefined
    );
    
    res.json({
      bulletins,
      total: bulletins.length,
      compliance_note: 'Closure bulletins for regulatory reporting'
    });
  } catch (error) {
    console.error('Error fetching closure bulletins:', error);
    res.status(500).json({ error: 'Failed to fetch closure bulletins' });
  }
});

/**
 * GET today's closure status
 * GET /api/legal/closure/today-status
 */
router.get('/today-status', async (req, res) => {
  try {
    const today = new Date();
    const bulletins = await LegalJournalModel.getClosureBulletins('DAILY');
    
    const todayBulletin = bulletins.find(bulletin => {
      const bulletinDate = new Date(bulletin.period_start);
      return bulletinDate.toDateString() === today.toDateString();
    });
    
    res.json({
      date: today.toISOString().split('T')[0],
      has_closure: !!todayBulletin,
      closure_status: todayBulletin ? 'COMPLETED' : 'PENDING',
      bulletin: todayBulletin || null,
      compliance_note: 'Daily closure status for regulatory compliance'
    });
  } catch (error) {
    console.error('Error fetching today\'s closure status:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s closure status' });
  }
});

export default router; 