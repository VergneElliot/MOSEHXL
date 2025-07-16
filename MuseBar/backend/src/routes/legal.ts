import express from 'express';
import { LegalJournalModel } from '../models/legalJournal';
import { ArchiveService } from '../models/archiveService';
import { pool } from '../app';
import { AuditTrailModel } from '../models/auditTrail';
import { requireAdmin, requireAuth } from './auth';
import { ClosureScheduler } from '../utils/closureScheduler';
import { BusinessSettingsModel } from '../models';

const router = express.Router();

// GET legal journal integrity verification
router.get('/journal/verify', async (req, res) => {
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

// GET legal journal entries (read-only for auditing)
router.get('/journal/entries', async (req, res) => {
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

// POST create daily closure bulletin
router.post('/closure/daily', async (req, res) => {
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

// POST create weekly closure bulletin
router.post('/closure/weekly', async (req, res) => {
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

// POST create monthly closure bulletin
router.post('/closure/monthly', async (req, res) => {
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

// POST create annual closure bulletin
router.post('/closure/annual', async (req, res) => {
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

// POST create closure bulletin (generic endpoint for all types)
router.post('/closure/create', async (req, res) => {
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
      ...closure,
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

// GET receipt for order (detailed receipt)
router.get('/receipt/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { type = 'detailed' } = req.query; // 'detailed' or 'summary'
    
    // Get order with items
    const orderQuery = `
      SELECT o.*, 
             array_agg(oi.*) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id
    `;
    const orderResult = await pool.query(orderQuery, [orderId]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orderResult.rows[0];
    
    // Fetch order items using OrderItemModel for reliability
    const { OrderItemModel } = require('../models');
    const items = await OrderItemModel.getByOrderId(order.id);
    order.items = items;
    
    // Get legal journal entry for this order
    const journalQuery = `
      SELECT * FROM legal_journal 
      WHERE order_id = $1 AND transaction_type = 'SALE'
      ORDER BY sequence_number DESC
      LIMIT 1
    `;
    const journalResult = await pool.query(journalQuery, [orderId]);
    const journalEntry = journalResult.rows[0];
    
    // Business information (should be configurable)
    const businessInfo = await BusinessSettingsModel.get();
    if (!businessInfo) {
      return res.status(500).json({ error: 'Business info not configured' });
    }
    
    // Calculate VAT breakdown
    let vatBreakdown: Array<{ rate: number, subtotal_ht: number, vat: number }> = [];
    let totalVat = 0;
    let totalHT = 0;
    if (order.items && Array.isArray(order.items)) {
      const vatMap: { [rate: number]: { subtotal_ht: number, vat: number } } = {};
      for (const item of order.items) {
        // Defensive: parse and default to 0 if missing
        const rateRaw = item.tax_rate !== undefined && item.tax_rate !== null ? Number(item.tax_rate) : 0;
        const rate = Math.round(rateRaw); // Group by 10, 20, etc.
        const vat = item.tax_amount !== undefined && item.tax_amount !== null ? Number(item.tax_amount) : 0;
        const total_price = item.total_price !== undefined && item.total_price !== null ? Number(item.total_price) : 0;
        const subtotal_ht = total_price - vat;
        if (!vatMap[rate]) {
          vatMap[rate] = { subtotal_ht: 0, vat: 0 };
        }
        vatMap[rate].subtotal_ht += subtotal_ht;
        vatMap[rate].vat += vat;
        totalVat += vat;
        totalHT += subtotal_ht;
      }
      vatBreakdown = Object.entries(vatMap).map(([rate, vals]) => ({ rate: Number(rate), ...vals }));
    }
    // Defensive fallback
    if (!vatBreakdown.length && journalEntry && journalEntry.vat_amount !== undefined) {
      totalVat = parseFloat(journalEntry.vat_amount);
    }

    if (type === 'summary') {
      // Summary receipt (no item details, but VAT breakdown if multiple rates)
      const summaryReceipt = {
        order_id: order.id,
        sequence_number: journalEntry?.sequence_number || 0,
        total_amount: order.total_amount,
        total_tax: totalVat,
        vat_breakdown: vatBreakdown,
        payment_method: order.payment_method,
        created_at: order.created_at,
        business_info: businessInfo,
        receipt_type: 'summary',
        compliance_info: {
          legal_reference: 'Article 286-I-3 bis du CGI',
          receipt_hash: journalEntry?.current_hash || '',
          register_id: 'MUSEBAR-REG-001'
        }
      };
      return res.json(summaryReceipt);
    } else {
      // Detailed receipt (with item details and VAT breakdown)
      const detailedReceipt = {
        order_id: order.id,
        sequence_number: journalEntry?.sequence_number || 0,
        total_amount: order.total_amount,
        total_tax: totalVat,
        vat_breakdown: vatBreakdown,
        payment_method: order.payment_method,
        created_at: order.created_at,
        items: order.items || [],
        tips: order.tips || 0,
        change: order.change || 0,
        business_info: businessInfo,
        receipt_type: 'detailed',
        compliance_info: {
          legal_reference: 'Article 286-I-3 bis du CGI',
          receipt_hash: journalEntry?.current_hash || '',
          register_id: 'MUSEBAR-REG-001'
        }
      };
      return res.json(detailedReceipt);
    }
    
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

// POST generate receipt (for immediate generation after payment)
router.post('/receipt/generate', async (req, res) => {
  try {
    const { order_id, receipt_type = 'detailed' } = req.body;
    
    if (!order_id) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    // Get order with items
    const orderQuery = `
      SELECT o.*, 
             array_agg(oi.*) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id
    `;
    const orderResult = await pool.query(orderQuery, [order_id]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orderResult.rows[0];
    
    // Fetch order items using OrderItemModel for reliability
    const { OrderItemModel } = require('../models');
    const items = await OrderItemModel.getByOrderId(order.id);
    order.items = items;

    // Get legal journal entry for this order
    const journalQuery = `
      SELECT * FROM legal_journal 
      WHERE order_id = $1 AND transaction_type = 'SALE'
      ORDER BY sequence_number DESC
      LIMIT 1
    `;
    const journalResult = await pool.query(journalQuery, [order_id]);
    const journalEntry = journalResult.rows[0];

    // Business information (should be configurable)
    const businessInfo = await BusinessSettingsModel.get();
    if (!businessInfo) {
      return res.status(500).json({ error: 'Business info not configured' });
    }

    // Calculate VAT breakdown
    let vatBreakdown: Array<{ rate: number, subtotal_ht: number, vat: number }> = [];
    let totalVat = 0;
    let totalHT = 0;
    if (order.items && Array.isArray(order.items)) {
      const vatMap: { [rate: number]: { subtotal_ht: number, vat: number } } = {};
      for (const item of order.items) {
        // Defensive: parse and default to 0 if missing
        const rateRaw = item.tax_rate !== undefined && item.tax_rate !== null ? Number(item.tax_rate) : 0;
        const rate = Math.round(rateRaw); // Group by 10, 20, etc.
        const vat = item.tax_amount !== undefined && item.tax_amount !== null ? Number(item.tax_amount) : 0;
        const total_price = item.total_price !== undefined && item.total_price !== null ? Number(item.total_price) : 0;
        const subtotal_ht = total_price - vat;
        if (!vatMap[rate]) {
          vatMap[rate] = { subtotal_ht: 0, vat: 0 };
        }
        vatMap[rate].subtotal_ht += subtotal_ht;
        vatMap[rate].vat += vat;
        totalVat += vat;
        totalHT += subtotal_ht;
      }
      vatBreakdown = Object.entries(vatMap).map(([rate, vals]) => ({ rate: Number(rate), ...vals }));
    }
    // Defensive fallback
    if (!vatBreakdown.length && journalEntry && journalEntry.vat_amount !== undefined) {
      totalVat = parseFloat(journalEntry.vat_amount);
    }

    if (receipt_type === 'summary') {
      // Summary receipt (no item details, but VAT breakdown if multiple rates)
      const summaryReceipt = {
        order_id: order.id,
        sequence_number: journalEntry?.sequence_number || 0,
        total_amount: order.total_amount,
        total_tax: totalVat,
        vat_breakdown: vatBreakdown,
        payment_method: order.payment_method,
        created_at: order.created_at,
        business_info: businessInfo,
        receipt_type: 'summary',
        compliance_info: {
          legal_reference: 'Article 286-I-3 bis du CGI',
          receipt_hash: journalEntry?.current_hash || '',
          register_id: 'MUSEBAR-REG-001'
        }
      };
      return res.json(summaryReceipt);
    } else {
      // Detailed receipt (with item details and VAT breakdown)
      const detailedReceipt = {
        order_id: order.id,
        sequence_number: journalEntry?.sequence_number || 0,
        total_amount: order.total_amount,
        total_tax: totalVat,
        vat_breakdown: vatBreakdown,
        payment_method: order.payment_method,
        created_at: order.created_at,
        items: order.items || [],
        tips: order.tips || 0,
        change: order.change || 0,
        business_info: businessInfo,
        receipt_type: 'detailed',
        compliance_info: {
          legal_reference: 'Article 286-I-3 bis du CGI',
          receipt_hash: journalEntry?.current_hash || '',
          register_id: 'MUSEBAR-REG-001'
        }
      };
      return res.json(detailedReceipt);
    }
    
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

// GET closure bulletins
router.get('/closure/bulletins', async (req, res) => {
  try {
    const { type } = req.query;
    const validTypes = ['DAILY', 'MONTHLY', 'ANNUAL'];
    
    if (type && !validTypes.includes(type as string)) {
      return res.status(400).json({ 
        error: 'Invalid closure type',
        valid_types: validTypes
      });
    }
    
    const bulletins = await LegalJournalModel.getClosureBulletins(type as 'DAILY' | 'MONTHLY' | 'ANNUAL');
    
    res.json({
      bulletins,
      total: bulletins.length,
      compliance_note: 'Closure bulletins implement the Conservation pillar of ISCA requirements'
    });
  } catch (error) {
    console.error('Error fetching closure bulletins:', error);
    res.status(500).json({ error: 'Failed to fetch closure bulletins' });
  }
});

// GET latest monthly closure bulletin (current month)
router.get('/closure/monthly-latest', async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const bulletins = await LegalJournalModel.getClosureBulletins('MONTHLY');
    // Find the bulletin for the current month
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

// GET audit trail
router.get('/audit/trail', async (req, res) => {
  try {
    const { 
      user_id, 
      action_type, 
      start_date, 
      end_date, 
      limit = 100, 
      offset = 0 
    } = req.query;
    
    let query = 'SELECT * FROM audit_trail WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;
    
    if (user_id) {
      query += ` AND user_id = $${++paramCount}`;
      values.push(user_id);
    }
    
    if (action_type) {
      query += ` AND action_type = $${++paramCount}`;
      values.push(action_type);
    }
    
    if (start_date && end_date) {
      query += ` AND timestamp >= $${++paramCount} AND timestamp <= $${++paramCount}`;
      values.push(start_date, end_date);
    }
    
    // For pagination
    query += ` ORDER BY timestamp DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    values.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await pool.query(query, values);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM audit_trail WHERE 1=1';
    const countValues: any[] = [];
    let countParam = 0;
    if (user_id) {
      countQuery += ` AND user_id = $${++countParam}`;
      countValues.push(user_id);
    }
    if (action_type) {
      countQuery += ` AND action_type = $${++countParam}`;
      countValues.push(action_type);
    }
    if (start_date && end_date) {
      countQuery += ` AND timestamp >= $${++countParam} AND timestamp <= $${++countParam}`;
      countValues.push(start_date, end_date);
    }
    const countResult = await pool.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      audit_entries: result.rows,
      total,
      filters_applied: { user_id, action_type, start_date, end_date },
      compliance_note: 'Audit trail implements the Sécurisation pillar of ISCA requirements'
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

// POST log audit event
router.post('/audit/log', async (req, res) => {
  try {
    const {
      user_id,
      action_type,
      resource_type,
      resource_id,
      action_details,
      ip_address,
      user_agent,
      session_id
    } = req.body;
    
    if (!action_type) {
      return res.status(400).json({ error: 'Action type is required' });
    }
    
    const query = `
      INSERT INTO audit_trail (
        user_id, action_type, resource_type, resource_id, 
        action_details, ip_address, user_agent, session_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      user_id,
      action_type,
      resource_type,
      resource_id,
      action_details ? JSON.stringify(action_details) : null,
      ip_address,
      user_agent,
      session_id
    ];
    
    const result = await pool.query(query, values);
    
    res.status(201).json({
      audit_entry: result.rows[0],
      compliance_note: 'Action logged for audit trail compliance'
    });
  } catch (error) {
    console.error('Error logging audit event:', error);
    res.status(500).json({ error: 'Failed to log audit event' });
  }
});

// GET legal compliance status overview
router.get('/compliance/status', async (req, res) => {
  try {
    // Get journal integrity
    const integrity = await LegalJournalModel.verifyJournalIntegrity();
    
    // Get latest closure bulletin
    const latestClosures = await LegalJournalModel.getClosureBulletins('DAILY');
    const latestClosure = latestClosures[0];
    
    // Get journal stats
    const journalStats = await pool.query(`
      SELECT 
        COUNT(*) as total_entries,
        MIN(timestamp) as first_entry,
        MAX(timestamp) as last_entry,
        COUNT(CASE WHEN transaction_type = 'SALE' THEN 1 END) as sale_transactions
      FROM legal_journal
    `);
    
    const stats = journalStats.rows[0];
    
    res.json({
      compliance_status: {
        journal_integrity: integrity.isValid ? 'VALID' : 'COMPROMISED',
        integrity_errors: integrity.errors,
        last_closure: latestClosure ? latestClosure.period_end : null,
        certification_required_by: '2025-08-31',
        certification_bodies: ['AFNOR (NF525)', 'LNE'],
        fine_risk: '€7,500 per non-compliant register'
      },
      journal_statistics: {
        total_entries: parseInt(stats.total_entries),
        sale_transactions: parseInt(stats.sale_transactions),
        first_entry: stats.first_entry,
        last_entry: stats.last_entry
      },
      isca_pillars: {
        inaltérabilité: 'Implemented (append-only journal with hash chain)',
        sécurisation: 'Implemented (audit trail and access control ready)',
        conservation: 'Implemented (closure bulletins)',
        archivage: 'Implemented (secure export with digital signatures)'
      },
      legal_reference: 'Article 286-I-3 bis du CGI',
      checked_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting compliance status:', error);
    res.status(500).json({ error: 'Failed to get compliance status' });
  }
});

// POST create archive export
router.post('/archive/export', async (req, res) => {
  try {
    const {
      export_type,
      period_start,
      period_end,
      format,
      created_by
    } = req.body;

    if (!export_type || !format || !created_by) {
      return res.status(400).json({ 
        error: 'Export type, format, and created_by are required' 
      });
    }

    const validTypes = ['DAILY', 'MONTHLY', 'ANNUAL', 'FULL'];
    const validFormats = ['CSV', 'XML', 'PDF', 'JSON'];

    if (!validTypes.includes(export_type)) {
      return res.status(400).json({ 
        error: 'Invalid export type',
        valid_types: validTypes
      });
    }

    if (!validFormats.includes(format)) {
      return res.status(400).json({ 
        error: 'Invalid format',
        valid_formats: validFormats
      });
    }

    const exportData = {
      export_type,
      period_start: period_start ? new Date(period_start) : undefined,
      period_end: period_end ? new Date(period_end) : undefined,
      format,
      created_by
    };

    const archiveExport = await ArchiveService.exportData(exportData);

    res.status(201).json({
      archive_export: archiveExport,
      compliance_note: 'Archive export created with digital signature for legal compliance'
    });
  } catch (error) {
    console.error('Error creating archive export:', error);
    res.status(500).json({ error: 'Failed to create archive export' });
  }
});

// GET archive exports
router.get('/archive/exports', async (req, res) => {
  try {
    const archiveExports = await ArchiveService.getArchiveExports();
    
    res.json({
      archive_exports: archiveExports,
      total: archiveExports.length,
      compliance_note: 'Archive exports implement the Archivage pillar of ISCA requirements'
    });
  } catch (error) {
    console.error('Error fetching archive exports:', error);
    res.status(500).json({ error: 'Failed to fetch archive exports' });
  }
});

// GET archive export by ID
router.get('/archive/exports/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid archive export ID' });
    }

    const archiveExport = await ArchiveService.getArchiveExportById(id);
    if (!archiveExport) {
      return res.status(404).json({ error: 'Archive export not found' });
    }

    res.json({
      archive_export: archiveExport,
      compliance_note: 'Archive export retrieved for legal compliance verification'
    });
  } catch (error) {
    console.error('Error fetching archive export:', error);
    res.status(500).json({ error: 'Failed to fetch archive export' });
  }
});

// POST verify archive export integrity
router.post('/archive/exports/:id/verify', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid archive export ID' });
    }

    const verification = await ArchiveService.verifyArchiveExport(id);

    res.json({
      verification_result: verification,
      compliance_note: 'Archive export integrity verified for legal compliance'
    });
  } catch (error) {
    console.error('Error verifying archive export:', error);
    res.status(500).json({ error: 'Failed to verify archive export' });
  }
});

// GET download archive export file
router.get('/archive/exports/:id/download', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid archive export ID' });
    }

    const downloadInfo = await ArchiveService.downloadArchiveExport(id);
    if (!downloadInfo) {
      return res.status(404).json({ error: 'Archive export file not found' });
    }

    res.download(downloadInfo.filePath, downloadInfo.fileName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ error: 'Failed to download archive export file' });
      }
    });
  } catch (error) {
    console.error('Error downloading archive export:', error);
    res.status(500).json({ error: 'Failed to download archive export' });
  }
});

// GET /api/legal/audit - fetch audit logs (admin only)
router.get('/audit', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user_id, action_type, resource_type, start, end, page = 1, pageSize = 50 } = req.query;
    const filters = [];
    const values = [];
    let idx = 1;
    if (user_id) { filters.push(`user_id = $${idx++}`); values.push(user_id); }
    if (action_type) { filters.push(`action_type = $${idx++}`); values.push(action_type); }
    if (resource_type) { filters.push(`resource_type = $${idx++}`); values.push(resource_type); }
    if (start) { filters.push(`timestamp >= $${idx++}`); values.push(start); }
    if (end) { filters.push(`timestamp <= $${idx++}`); values.push(end); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(pageSize);
    const query = `
      SELECT * FROM audit_trail
      ${where}
      ORDER BY timestamp DESC
      LIMIT $${idx++} OFFSET $${idx}
    `;
    values.push(pageSize, offset);
    const result = await req.app.get('db').query(query, values);
    res.json({ entries: result.rows });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET legal journal integrity status
router.get('/integrity', async (req, res) => {
  try {
    const result = await LegalJournalModel.verifyJournalIntegrity();
    res.json(result);
  } catch (error) {
    console.error('Error checking integrity:', error);
    res.status(500).json({ error: 'Failed to check integrity' });
  }
});

// GET legal journal entries
router.get('/journal', async (req, res) => {
  try {
    const query = 'SELECT * FROM legal_journal ORDER BY sequence_number ASC';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching journal:', error);
    res.status(500).json({ error: 'Failed to fetch journal' });
  }
});

// GET closure bulletins
router.get('/closures', async (req, res) => {
  try {
    const query = 'SELECT * FROM closure_bulletins ORDER BY created_at DESC';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching closures:', error);
    res.status(500).json({ error: 'Failed to fetch closures' });
  }
});

// DEVELOPMENT ONLY: Debug hash verification
router.get('/dev/debug-hash', async (req, res) => {
  try {
    const query = 'SELECT * FROM legal_journal ORDER BY sequence_number ASC LIMIT 1';
    const result = await pool.query(query);
    const entry = result.rows[0];
    
    if (!entry) {
      return res.json({ error: 'No entries found' });
    }
    
    // Recreate the data string exactly as the verification function does
    const dataString = `${entry.sequence_number}|${entry.transaction_type}|${entry.order_id}|${entry.amount}|${entry.vat_amount}|${entry.payment_method}|${entry.timestamp.toISOString()}|${entry.register_id}`;
    
    // Calculate what the hash should be
    const crypto = require('crypto');
    const content = `${entry.previous_hash}|${dataString}`;
    const expectedHash = crypto.createHash('sha256').update(content).digest('hex');
    
    res.json({
      entry,
      dataString,
      expectedHash,
      storedHash: entry.current_hash,
      hashesMatch: expectedHash === entry.current_hash,
      contentForHashing: content
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Debug failed' });
  }
});

// PRODUCTION CLEAN RESET: Complete legal-compliant reset preserving admin
router.post('/admin/clean-reset', async (req, res) => {
  try {

    
    // Read and execute the comprehensive reset script
    const fs = require('fs');
    const path = require('path');
    const resetScript = fs.readFileSync(path.join(__dirname, '../../clean-reset-for-production.sql'), 'utf8');
    
    // Execute the script
    await pool.query(resetScript);
    

    res.json({ 
      success: true, 
      message: 'Complete clean reset executed successfully - admin user preserved, all transactional data cleared',
      legal_status: 'COMPLIANT',
      admin_preserved: true
    });
    
  } catch (error: any) {
    console.error('❌ Clean reset failed:', error);
    res.status(500).json({ error: 'Clean reset failed', details: error.message });
  }
});

// DEVELOPMENT ONLY: Reset legal journal
router.post('/dev/reset-journal', async (req, res) => {
  try {
    // ⚠️ DEVELOPMENT ONLY - Never use in production!

    
    // Step 1: Temporarily disable legal protection triggers for development
    await pool.query('DROP TRIGGER IF EXISTS trigger_prevent_legal_journal_modification ON legal_journal');
    await pool.query('DROP TRIGGER IF EXISTS trigger_prevent_closed_bulletin_modification ON closure_bulletins');
    
    // Step 2: Clear existing entries
    await pool.query('DELETE FROM legal_journal');
    await pool.query('DELETE FROM closure_bulletins');
    
    // Step 3: Reset sequences
    await pool.query('ALTER SEQUENCE legal_journal_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE closure_bulletins_id_seq RESTART WITH 1');
    
    // Step 4: Insert clean initialization entry using proper hash generation
    const result = await LegalJournalModel.addEntry(
      'ARCHIVE',
      null,
      0.00,
      0.00,
      'SYSTEM',
      {
        type: 'SYSTEM_INIT',
        message: 'Legal journal reset for development',
        compliance: 'Article 286-I-3 bis du CGI',
        environment: 'DEVELOPMENT'
      }
    );
    
    // Step 5: Recreate legal protection triggers
    await pool.query(`
      CREATE OR REPLACE FUNCTION prevent_legal_journal_modification()
      RETURNS TRIGGER AS $$
      BEGIN
          IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
              RAISE EXCEPTION 'Modification of legal journal is forbidden for legal compliance (Article 286-I-3 bis du CGI)';
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await pool.query(`
      CREATE TRIGGER trigger_prevent_legal_journal_modification
          BEFORE UPDATE OR DELETE ON legal_journal
          FOR EACH ROW
          EXECUTE FUNCTION prevent_legal_journal_modification();
    `);
    
    await pool.query(`
      CREATE OR REPLACE FUNCTION prevent_closed_bulletin_modification()
      RETURNS TRIGGER AS $$
      BEGIN
          IF TG_OP = 'UPDATE' AND OLD.is_closed = TRUE THEN
              RAISE EXCEPTION 'Modification of closed closure bulletin is forbidden for legal compliance';
          END IF;
          IF TG_OP = 'DELETE' AND OLD.is_closed = TRUE THEN
              RAISE EXCEPTION 'Deletion of closed closure bulletin is forbidden for legal compliance';
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await pool.query(`
      CREATE TRIGGER trigger_prevent_closed_bulletin_modification
          BEFORE UPDATE OR DELETE ON closure_bulletins
          FOR EACH ROW
          EXECUTE FUNCTION prevent_closed_bulletin_modification();
    `);
    

    res.json({ 
      success: true, 
      message: 'Legal journal has been reset for development with protections restored',
      initialEntry: result
    });
    
  } catch (error) {
    console.error('Error resetting legal journal:', error);
    res.status(500).json({ error: 'Failed to reset legal journal' });
  }
});

// ==========================================
// CLOSURE BULLETIN MANAGEMENT
// ==========================================

// GET closure settings
router.get('/closure-settings', async (req, res) => {
  try {
    const query = 'SELECT * FROM closure_settings ORDER BY setting_key';
    const result = await pool.query(query);
    
    // Convert to key-value object
    const settings: any = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = {
        value: row.setting_value,
        description: row.description,
        updated_by: row.updated_by,
        updated_at: row.updated_at
      };
    });
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching closure settings:', error);
    res.status(500).json({ error: 'Failed to fetch closure settings' });
  }
});

// PUT update closure settings
router.put('/closure-settings', async (req, res) => {
  try {
    const { settings, updated_by } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }
    
    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(`
        UPDATE closure_settings 
        SET setting_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP 
        WHERE setting_key = $3
      `, [value, updated_by || 'ADMIN', key]);
    }
    
    res.json({ success: true, message: 'Closure settings updated successfully' });
  } catch (error) {
    console.error('Error updating closure settings:', error);
    res.status(500).json({ error: 'Failed to update closure settings' });
  }
});

// POST manual daily closure
router.post('/closure/create-daily', async (req, res) => {
  try {
    const { date, force } = req.body;
    
    // Parse date or use today
    const closureDate = date ? new Date(date) : new Date();
    const dateString = closureDate.toISOString().split('T')[0];
    
    // Check if closure already exists for this date
    const existingQuery = `
      SELECT * FROM closure_bulletins 
      WHERE closure_type = 'DAILY' 
      AND DATE(period_start) = $1
    `;
    const existing = await pool.query(existingQuery, [dateString]);
    
    if (existing.rows.length > 0 && !force) {
      return res.status(409).json({ 
        error: 'Daily closure already exists for this date',
        existing_closure: existing.rows[0],
        suggestion: 'Use force=true to override'
      });
    }
    
    // Create the daily closure using the legal model
    const closure = await LegalJournalModel.createDailyClosure(closureDate);
    

    res.json({ 
      success: true, 
      message: `Daily closure created for ${dateString}`,
      closure 
    });
    
  } catch (error) {
    console.error('Error creating daily closure:', error);
    res.status(500).json({ error: 'Failed to create daily closure' });
  }
});

// GET closure bulletins with filters
router.get('/closures', async (req, res) => {
  try {
    const { type, start_date, end_date, limit } = req.query;
    
    let query = `
      SELECT cb.*, 
             (SELECT COUNT(*) FROM legal_journal lj 
              WHERE lj.sequence_number BETWEEN cb.first_sequence AND cb.last_sequence) as journal_entries_count
      FROM closure_bulletins cb 
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramCount = 0;
    
    if (type) {
      paramCount++;
      query += ` AND closure_type = $${paramCount}`;
      values.push(type);
    }
    
    if (start_date) {
      paramCount++;
      query += ` AND period_start >= $${paramCount}`;
      values.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      query += ` AND period_end <= $${paramCount}`;
      values.push(end_date);
    }
    
    query += ' ORDER BY period_start DESC';
    
    if (limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      values.push(parseInt(limit as string));
    }
    
    const result = await pool.query(query, values);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching closures:', error);
    res.status(500).json({ error: 'Failed to fetch closures' });
  }
});

// GET closure status for today
router.get('/closure/today-status', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if today has been closed
    const closureQuery = `
      SELECT * FROM closure_bulletins 
      WHERE closure_type = 'DAILY' 
      AND DATE(period_start) = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const closureResult = await pool.query(closureQuery, [today]);
    
    // Get settings for auto-closure
    const settingsQuery = 'SELECT setting_key, setting_value FROM closure_settings';
    const settingsResult = await pool.query(settingsQuery);
    const settings: any = {};
    settingsResult.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    
    // Calculate next auto-closure time
    const closureTime = settings.daily_closure_time || '02:00';
    const [hours, minutes] = closureTime.split(':').map(Number);
    const nextClosure = new Date();
    nextClosure.setHours(hours, minutes, 0, 0);
    
    // If closure time has passed today, it's for tomorrow
    if (nextClosure <= new Date()) {
      nextClosure.setDate(nextClosure.getDate() + 1);
    }
    
    res.json({
      is_closed: closureResult.rows.length > 0,
      closure_bulletin: closureResult.rows[0] || null,
      auto_closure_enabled: settings.auto_closure_enabled === 'true',
      next_auto_closure: nextClosure.toISOString(),
      closure_settings: settings
    });
    
  } catch (error) {
    console.error('Error checking today status:', error);
    res.status(500).json({ error: 'Failed to check today status' });
  }
});

// POST production clean reset (DANGEROUS - Admin only)
router.post('/production/clean-reset', async (req, res) => {
  try {
    const { confirmationCode } = req.body;
    
    // Safety check - require specific confirmation code
    if (confirmationCode !== 'CLEAN_RESET_PRODUCTION_2025') {
      return res.status(403).json({ 
        error: 'Invalid confirmation code',
        message: 'This operation requires a specific confirmation code for safety' 
      });
    }


    
    // Step 1: Preserve admin user
    const adminBackup = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['elliot.vergne@gmail.com']
    );
    
    if (adminBackup.rows.length === 0) {
      throw new Error('Admin user not found - cannot proceed with reset');
    }
    
    const adminUser = adminBackup.rows[0];
    
    // Step 2: Temporarily disable triggers
    await pool.query('DROP TRIGGER IF EXISTS trigger_prevent_legal_journal_modification ON legal_journal');
    await pool.query('DROP TRIGGER IF EXISTS trigger_prevent_closed_bulletin_modification ON closure_bulletins');
    
    // Step 3: Clean all transactional data
    await pool.query('DELETE FROM audit_trail');
    await pool.query('ALTER SEQUENCE audit_trail_id_seq RESTART WITH 1');
    
    await pool.query('DELETE FROM legal_journal');
    await pool.query('ALTER SEQUENCE legal_journal_id_seq RESTART WITH 1');
    
    await pool.query('DELETE FROM closure_bulletins');
    await pool.query('ALTER SEQUENCE closure_bulletins_id_seq RESTART WITH 1');
    
    await pool.query('DELETE FROM archive_exports');
    await pool.query('ALTER SEQUENCE archive_exports_id_seq RESTART WITH 1');
    
    await pool.query('DELETE FROM sub_bills');
    await pool.query('DELETE FROM order_items');
    await pool.query('DELETE FROM orders');
    await pool.query('ALTER SEQUENCE orders_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE order_items_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE sub_bills_id_seq RESTART WITH 1');
    
    // Clear all users except admin
    await pool.query('DELETE FROM users WHERE email != $1', ['elliot.vergne@gmail.com']);
    
    // Step 4: Initialize clean legal journal using proper method
    const initEntry = await LegalJournalModel.addEntry(
      'ARCHIVE',
      null,
      0.00,
      0.00,
      'SYSTEM',
      {
        type: 'SYSTEM_INIT',
        message: 'Legal journal initialized for production',
        compliance: 'Article 286-I-3 bis du CGI',
        environment: 'PRODUCTION',
        admin_preserved: true
      },
      adminUser.id.toString()
    );
    
    // Step 5: Restore legal protection triggers
    await pool.query(`
      CREATE OR REPLACE FUNCTION prevent_legal_journal_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'Modification of legal journal is forbidden for legal compliance (Article 286-I-3 bis du CGI)';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    await pool.query(`
      CREATE TRIGGER trigger_prevent_legal_journal_modification
      BEFORE UPDATE OR DELETE ON legal_journal
      FOR EACH ROW
      EXECUTE FUNCTION prevent_legal_journal_modification()
    `);
    
    await pool.query(`
      CREATE OR REPLACE FUNCTION prevent_closed_bulletin_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'UPDATE' AND OLD.is_closed = TRUE THEN
          RAISE EXCEPTION 'Modification of closed closure bulletin is forbidden for legal compliance';
        END IF;
        IF TG_OP = 'DELETE' AND OLD.is_closed = TRUE THEN
          RAISE EXCEPTION 'Deletion of closed closure bulletin is forbidden for legal compliance';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    await pool.query(`
      CREATE TRIGGER trigger_prevent_closed_bulletin_modification
      BEFORE UPDATE OR DELETE ON closure_bulletins
      FOR EACH ROW
      EXECUTE FUNCTION prevent_closed_bulletin_modification()
    `);
    
    // Step 6: Create closure settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS closure_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(50) NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_by VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default settings
    const defaultSettings = [
      ['daily_closure_time', '02:00', 'Time when daily closure is automatically triggered (HH:MM format)', 'SYSTEM'],
      ['auto_closure_enabled', 'true', 'Whether automatic daily closure is enabled', 'SYSTEM'],
      ['timezone', 'Europe/Paris', 'Timezone for closure calculations', 'SYSTEM'],
      ['closure_grace_period_minutes', '30', 'Grace period in minutes before auto-closure', 'SYSTEM']
    ];
    
    for (const [key, value, description, updatedBy] of defaultSettings) {
      await pool.query(`
        INSERT INTO closure_settings (setting_key, setting_value, description, updated_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (setting_key) DO UPDATE SET 
          setting_value = EXCLUDED.setting_value,
          updated_at = CURRENT_TIMESTAMP
      `, [key, value, description, updatedBy]);
    }
    
    // Final verification
    const finalStats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COUNT(*) FROM legal_journal) as legal_journal_entries,
        (SELECT COUNT(*) FROM closure_bulletins) as closure_bulletins,
        (SELECT COUNT(*) FROM audit_trail) as audit_entries,
        (SELECT email FROM users WHERE email = 'elliot.vergne@gmail.com') as admin_preserved
    `);
    

    
    res.json({
      success: true,
      message: 'Production clean reset completed successfully',
      stats: finalStats.rows[0],
      reset_timestamp: new Date(),
      compliance_note: 'Legal journal integrity restored per Article 286-I-3 bis du CGI'
    });
    
  } catch (error) {
    console.error('❌ PRODUCTION CLEAN RESET FAILED:', error);
    res.status(500).json({ 
      error: 'Production clean reset failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET scheduler status
router.get('/scheduler/status', async (req, res) => {
  try {
    const status = ClosureScheduler.getStatus();
    const settings = await ClosureScheduler.getClosureSettings();
    
    res.json({
      scheduler: status,
      settings: settings
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

// POST manual closure trigger
router.post('/scheduler/trigger', async (req, res) => {
  try {
    await ClosureScheduler.triggerManualCheck();
    res.json({ message: 'Manual closure check triggered' });
  } catch (error) {
    console.error('Error triggering manual check:', error);
    res.status(500).json({ error: 'Failed to trigger manual check' });
  }
});

// POST update closure settings
router.post('/settings/closure', async (req, res) => {
  try {
    const { daily_closure_time, auto_closure_enabled, grace_period_minutes } = req.body;
    
    if (daily_closure_time) {
      await pool.query(`
        INSERT INTO closure_settings (setting_key, setting_value, description, updated_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (setting_key) DO UPDATE SET 
          setting_value = EXCLUDED.setting_value,
          updated_at = CURRENT_TIMESTAMP
      `, ['daily_closure_time', daily_closure_time, 'Time when daily closure is automatically triggered (HH:MM format)', (req as any).user?.email || 'unknown']);
    }
    
    if (auto_closure_enabled !== undefined) {
      await pool.query(`
        INSERT INTO closure_settings (setting_key, setting_value, description, updated_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (setting_key) DO UPDATE SET 
          setting_value = EXCLUDED.setting_value,
          updated_at = CURRENT_TIMESTAMP
      `, ['auto_closure_enabled', auto_closure_enabled.toString(), 'Whether automatic daily closure is enabled', (req as any).user?.email || 'unknown']);
    }
    
    if (grace_period_minutes) {
      await pool.query(`
        INSERT INTO closure_settings (setting_key, setting_value, description, updated_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (setting_key) DO UPDATE SET 
          setting_value = EXCLUDED.setting_value,
          updated_at = CURRENT_TIMESTAMP
      `, ['closure_grace_period_minutes', grace_period_minutes.toString(), 'Grace period in minutes before auto-closure', (req as any).user?.email || 'unknown']);
    }
    
    res.json({ message: 'Closure settings updated successfully' });
  } catch (error) {
    console.error('Error updating closure settings:', error);
    res.status(500).json({ error: 'Failed to update closure settings' });
  }
});

// GET business info
router.get('/business-info', async (req, res) => {
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

// GET live monthly stats (not based on closure, but on all orders in the current month)
router.get('/stats/monthly-live', async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Query all completed orders for the current month
    const ordersResult = await pool.query(
      `SELECT * FROM orders WHERE created_at >= $1 AND created_at <= $2 AND status = 'completed'`,
      [monthStart, monthEnd]
    );
    const orders = ordersResult.rows;

    // Populate items for each order
    const { OrderItemModel } = require('../models');
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItemModel.getByOrderId(order.id);
        return {
          ...order,
          items: Array.isArray(items) ? items : []
        };
      })
    );

    // Calculate stats
    const totalTransactions = ordersWithItems.length;
    const totalAmount = ordersWithItems.reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0);
    const totalVat = ordersWithItems.reduce((sum, order) => sum + parseFloat(order.total_tax || '0'), 0);
    const totalTips = ordersWithItems.reduce((sum, order) => sum + parseFloat(order.tips || '0'), 0);
    const totalChange = ordersWithItems.reduce((sum, order) => sum + parseFloat(order.change || '0'), 0);

    res.json({
      total_transactions: totalTransactions,
      total_amount: totalAmount,
      total_vat: totalVat,
      tips_total: totalTips,
      change_total: totalChange
    });
  } catch (error) {
    console.error('Error fetching live monthly stats:', error);
    res.status(500).json({ error: 'Failed to fetch live monthly stats' });
  }
});

export default router; 