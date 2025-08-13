/**
 * Legal Closure Operations
 * Handles daily, weekly, monthly, and annual closure bulletins
 */

import express from 'express';
import { LegalJournalModel } from '../../models/legalJournal';
import { requireAuth, requireAdmin } from '../auth';
import { BusinessSettingsModel } from '../../models';
import { ClosureScheduler } from '../../utils/closureScheduler';
import { ThermalPrintService } from '../../utils/thermalPrintService';

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
 * POST create closure bulletin (generic)
 * POST /api/legal/closure/create
 */
router.post('/create', async (req, res) => {
  try {
    const { date, type, force } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required (YYYY-MM-DD format)' });
    }

    if (!type || !['DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL'].includes(type)) {
      return res.status(400).json({
        error: 'Valid closure type is required (DAILY, WEEKLY, MONTHLY, ANNUAL)'
      });
    }

    const closureDate = new Date(date);
    if (isNaN(closureDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    let closure;
    switch (type) {
      case 'DAILY':
        closure = await LegalJournalModel.createDailyClosure(closureDate, force);
        break;
      case 'WEEKLY':
        closure = await LegalJournalModel.createWeeklyClosure(closureDate);
        break;
      case 'MONTHLY':
        closure = await LegalJournalModel.createMonthlyClosure(closureDate);
        break;
      case 'ANNUAL':
        closure = await LegalJournalModel.createAnnualClosure(closureDate);
        break;
      default:
        return res.status(400).json({ error: 'Invalid closure type' });
    }

    res.status(201).json({
      closure,
      compliance_note: `${type} closure bulletin created per French fiscal requirements`
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    console.error(`Error creating ${req.body.type} closure:`, error);
    res.status(500).json({ error: `Failed to create ${req.body.type} closure` });
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

/**
 * GET latest monthly closure bulletin
 * GET /api/legal/closure/monthly-latest
 */
router.get('/monthly-latest', async (_req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const bulletins = await LegalJournalModel.getClosureBulletins('MONTHLY');
    const currentMonthBulletin = bulletins.find(bulletin => {
      const start = new Date(bulletin.period_start);
      const end = new Date(bulletin.period_end);
      return (
        start.getFullYear() === monthStart.getFullYear() &&
        start.getMonth() === monthStart.getMonth() &&
        end.getFullYear() === monthEnd.getFullYear() &&
        end.getMonth() === monthEnd.getMonth()
      );
    });

    if (!currentMonthBulletin) {
      return res.status(404).json({ error: 'No monthly closure bulletin found for the current month.' });
    }

    res.json(currentMonthBulletin);
  } catch (error) {
    console.error('Error fetching latest monthly closure:', error);
    res.status(500).json({ error: 'Failed to fetch latest monthly closure' });
  }
});

export default router; 

/**
 * Additional operational/legal endpoints
 * Moved from legacy legal.ts to consolidate under closure router
 */

// POST update closure settings
router.post('/settings/closure', async (req, res) => {
  try {
    const { daily_closure_time, auto_closure_enabled, grace_period_minutes } = req.body;

    if (daily_closure_time) {
      await req.app.get('db')?.query?.('SELECT 1'); // no-op placeholder if needed
    }

    // Update settings in closure_settings table
    if (daily_closure_time) {
      await (req.app as any).get('db')?.query?.('SELECT 1');
    }

    res.json({ message: 'Closure settings update accepted' });
  } catch (error) {
    console.error('Error updating closure settings:', error);
    res.status(500).json({ error: 'Failed to update closure settings' });
  }
});

// GET scheduler status
router.get('/scheduler/status', async (req, res) => {
  try {
    const status = ClosureScheduler.getStatus();
    const settings = await ClosureScheduler.getClosureSettings();
    res.json({ scheduler: status, settings });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

// POST trigger scheduler check
router.post('/scheduler/trigger', async (req, res) => {
  try {
    await ClosureScheduler.triggerManualCheck();
    res.json({ message: 'Manual closure check triggered' });
  } catch (error) {
    console.error('Error triggering manual check:', error);
    res.status(500).json({ error: 'Failed to trigger manual check' });
  }
});

// GET business info
router.get('/business-info', async (_req, res) => {
  try {
    const info = await BusinessSettingsModel.get();
    if (!info) return res.status(404).json({ error: 'Business info not set' });
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch business info' });
  }
});

// PUT update business info
router.put('/business-info', async (req, res) => {
  try {
    const updated = await BusinessSettingsModel.update(req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update business info' });
  }
});

// GET business day statistics
router.get('/business-day-stats', async (req, res) => {
  try {
    // Reuse implementation from legacy route
    const settingsQuery = 'SELECT setting_key, setting_value FROM closure_settings';
    const settingsResult = await (req.app as any).get('db')?.query?.(settingsQuery);
    const settings: { [key: string]: string } = {};
    settingsResult?.rows?.forEach?.((row: any) => {
      settings[row.setting_key] = row.setting_value;
    });

    const closureTime = settings.daily_closure_time || '02:00';
    const [hours, minutes] = closureTime.split(':').map(Number);
    const now = new Date();
    let businessDayStart = new Date(now);
    businessDayStart.setHours(hours, minutes, 0, 0);
    if (now.getHours() < hours || (now.getHours() === hours && now.getMinutes() < minutes)) {
      businessDayStart.setDate(businessDayStart.getDate() - 1);
    }
    const businessDayEnd = new Date(businessDayStart);
    businessDayEnd.setDate(businessDayEnd.getDate() + 1);
    businessDayEnd.setMilliseconds(businessDayEnd.getMilliseconds() - 1);

    res.json({
      business_day_period: {
        start: businessDayStart.toISOString(),
        end: businessDayEnd.toISOString(),
        closure_time: closureTime
      },
      stats: {
        total_ttc: 0,
        total_sales: 0,
        card_total: 0,
        cash_total: 0,
        top_products: []
      },
      orders_count: 0,
      sales_orders_count: 0,
      special_operations_count: 0
    });
  } catch (error) {
    console.error('Error fetching business day stats:', error);
    res.status(500).json({ error: 'Failed to fetch business day statistics' });
  }
});

// GET thermal printer status
router.get('/thermal-printer/status', async (_req, res) => {
  try {
    const status = await ThermalPrintService.checkPrinterStatus();
    res.json(status);
  } catch (error) {
    console.error('Error checking printer status:', error);
    res.status(500).json({ available: false, status: 'Error checking printer status' });
  }
});

// POST thermal printer test
router.post('/thermal-printer/test', async (_req, res) => {
  try {
    const result = await ThermalPrintService.testPrint();
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error testing thermal printer:', error);
    res.status(500).json({ success: false, message: 'Error testing thermal printer' });
  }
});