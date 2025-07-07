"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const legalJournal_1 = require("../models/legalJournal");
const archiveService_1 = require("../models/archiveService");
const app_1 = require("../app");
const router = express_1.default.Router();
// GET legal journal integrity verification
router.get('/journal/verify', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const verification = yield legalJournal_1.LegalJournalModel.verifyJournalIntegrity();
        res.json({
            integrity_status: verification.isValid ? 'VALID' : 'COMPROMISED',
            errors: verification.errors,
            verified_at: new Date().toISOString(),
            compliance: 'Article 286-I-3 bis du CGI'
        });
    }
    catch (error) {
        console.error('Error verifying journal integrity:', error);
        res.status(500).json({ error: 'Failed to verify journal integrity' });
    }
}));
// GET legal journal entries (read-only for auditing)
router.get('/journal/entries', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { start_date, end_date, limit = 100, offset = 0 } = req.query;
        let query = 'SELECT * FROM legal_journal ORDER BY sequence_number DESC';
        const values = [];
        if (start_date && end_date) {
            query = `
        SELECT * FROM legal_journal 
        WHERE timestamp >= $1 AND timestamp <= $2 
        ORDER BY sequence_number DESC
      `;
            values.push(start_date, end_date);
        }
        query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        values.push(parseInt(limit), parseInt(offset));
        const result = yield app_1.pool.query(query, values);
        // Get total count for pagination
        const countQuery = start_date && end_date
            ? 'SELECT COUNT(*) FROM legal_journal WHERE timestamp >= $1 AND timestamp <= $2'
            : 'SELECT COUNT(*) FROM legal_journal';
        const countValues = start_date && end_date ? [start_date, end_date] : [];
        const countResult = yield app_1.pool.query(countQuery, countValues);
        res.json({
            entries: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset),
            compliance_note: 'Journal entries are immutable per French fiscal law'
        });
    }
    catch (error) {
        console.error('Error fetching journal entries:', error);
        res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
}));
// POST create daily closure bulletin
router.post('/closure/daily', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.body;
        if (!date) {
            return res.status(400).json({ error: 'Date is required (YYYY-MM-DD format)' });
        }
        const closureDate = new Date(date);
        if (isNaN(closureDate.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }
        const closure = yield legalJournal_1.LegalJournalModel.createDailyClosure(closureDate);
        res.status(201).json(Object.assign(Object.assign({}, closure), { compliance_note: 'Daily closure bulletin created per French fiscal requirements' }));
    }
    catch (error) {
        console.error('Error creating daily closure:', error);
        res.status(500).json({ error: 'Failed to create daily closure' });
    }
}));
// GET closure bulletins
router.get('/closure/bulletins', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type } = req.query;
        const validTypes = ['DAILY', 'MONTHLY', 'ANNUAL'];
        if (type && !validTypes.includes(type)) {
            return res.status(400).json({
                error: 'Invalid closure type',
                valid_types: validTypes
            });
        }
        const bulletins = yield legalJournal_1.LegalJournalModel.getClosureBulletins(type);
        res.json({
            bulletins,
            total: bulletins.length,
            compliance_note: 'Closure bulletins implement the Conservation pillar of ISCA requirements'
        });
    }
    catch (error) {
        console.error('Error fetching closure bulletins:', error);
        res.status(500).json({ error: 'Failed to fetch closure bulletins' });
    }
}));
// GET audit trail
router.get('/audit/trail', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user_id, action_type, start_date, end_date, limit = 100, offset = 0 } = req.query;
        let query = 'SELECT * FROM audit_trail WHERE 1=1';
        const values = [];
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
        query += ` ORDER BY timestamp DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
        values.push(parseInt(limit), parseInt(offset));
        const result = yield app_1.pool.query(query, values);
        res.json({
            audit_entries: result.rows,
            total: result.rows.length,
            filters_applied: { user_id, action_type, start_date, end_date },
            compliance_note: 'Audit trail implements the Sécurisation pillar of ISCA requirements'
        });
    }
    catch (error) {
        console.error('Error fetching audit trail:', error);
        res.status(500).json({ error: 'Failed to fetch audit trail' });
    }
}));
// POST log audit event
router.post('/audit/log', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user_id, action_type, resource_type, resource_id, action_details, ip_address, user_agent, session_id } = req.body;
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
        const result = yield app_1.pool.query(query, values);
        res.status(201).json({
            audit_entry: result.rows[0],
            compliance_note: 'Action logged for audit trail compliance'
        });
    }
    catch (error) {
        console.error('Error logging audit event:', error);
        res.status(500).json({ error: 'Failed to log audit event' });
    }
}));
// GET legal compliance status overview
router.get('/compliance/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get journal integrity
        const integrity = yield legalJournal_1.LegalJournalModel.verifyJournalIntegrity();
        // Get latest closure bulletin
        const latestClosures = yield legalJournal_1.LegalJournalModel.getClosureBulletins('DAILY');
        const latestClosure = latestClosures[0];
        // Get journal stats
        const journalStats = yield app_1.pool.query(`
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
    }
    catch (error) {
        console.error('Error getting compliance status:', error);
        res.status(500).json({ error: 'Failed to get compliance status' });
    }
}));
// POST create archive export
router.post('/archive/export', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { export_type, period_start, period_end, format, created_by } = req.body;
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
        const archiveExport = yield archiveService_1.ArchiveService.exportData(exportData);
        res.status(201).json({
            archive_export: archiveExport,
            compliance_note: 'Archive export created with digital signature for legal compliance'
        });
    }
    catch (error) {
        console.error('Error creating archive export:', error);
        res.status(500).json({ error: 'Failed to create archive export' });
    }
}));
// GET archive exports
router.get('/archive/exports', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const archiveExports = yield archiveService_1.ArchiveService.getArchiveExports();
        res.json({
            archive_exports: archiveExports,
            total: archiveExports.length,
            compliance_note: 'Archive exports implement the Archivage pillar of ISCA requirements'
        });
    }
    catch (error) {
        console.error('Error fetching archive exports:', error);
        res.status(500).json({ error: 'Failed to fetch archive exports' });
    }
}));
// GET archive export by ID
router.get('/archive/exports/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid archive export ID' });
        }
        const archiveExport = yield archiveService_1.ArchiveService.getArchiveExportById(id);
        if (!archiveExport) {
            return res.status(404).json({ error: 'Archive export not found' });
        }
        res.json({
            archive_export: archiveExport,
            compliance_note: 'Archive export retrieved for legal compliance verification'
        });
    }
    catch (error) {
        console.error('Error fetching archive export:', error);
        res.status(500).json({ error: 'Failed to fetch archive export' });
    }
}));
// POST verify archive export integrity
router.post('/archive/exports/:id/verify', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid archive export ID' });
        }
        const verification = yield archiveService_1.ArchiveService.verifyArchiveExport(id);
        res.json({
            verification_result: verification,
            compliance_note: 'Archive export integrity verified for legal compliance'
        });
    }
    catch (error) {
        console.error('Error verifying archive export:', error);
        res.status(500).json({ error: 'Failed to verify archive export' });
    }
}));
// GET download archive export file
router.get('/archive/exports/:id/download', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid archive export ID' });
        }
        const downloadInfo = yield archiveService_1.ArchiveService.downloadArchiveExport(id);
        if (!downloadInfo) {
            return res.status(404).json({ error: 'Archive export file not found' });
        }
        res.download(downloadInfo.filePath, downloadInfo.fileName, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).json({ error: 'Failed to download archive export file' });
            }
        });
    }
    catch (error) {
        console.error('Error downloading archive export:', error);
        res.status(500).json({ error: 'Failed to download archive export' });
    }
}));
exports.default = router;
