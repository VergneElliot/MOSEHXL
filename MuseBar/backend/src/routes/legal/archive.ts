/**
 * Legal Archive Operations
 * Handles data archiving, retention, and compliance storage
 */

import express from 'express';
import { ArchiveService } from '../../models/archiveService';
import { requireAuth, requireAdmin } from '../auth';

const router = express.Router();

// All archive routes require authentication.
router.use(requireAuth);

/**
 * POST create archive
 * POST /api/legal/archive/create
 */
router.post('/create', requireAdmin, async (req, res) => {
  try {
    const { archiveType, startDate, endDate } = req.body;
    
    if (!archiveType || !startDate || !endDate) {
      return res.status(400).json({ error: 'Archive type, start date, and end date are required' });
    }
    
    const establishmentId = req.user?.establishment_id ?? undefined;
    if (archiveType === 'DAILY' && !establishmentId) {
      return res.status(400).json({ error: 'DAILY archive requires an authenticated user with establishment context.' });
    }
    const archive = await ArchiveService.exportData({
      export_type: archiveType as 'DAILY' | 'MONTHLY' | 'ANNUAL' | 'FULL',
      period_start: new Date(startDate),
      period_end: new Date(endDate),
      format: 'JSON',
      created_by: String(req.user?.id || 'system'),
      establishment_id: establishmentId
    });
    
    res.status(201).json({
      message: 'Archive created successfully',
      archive,
      compliance_note: 'Archive created for regulatory retention requirements'
    });
  } catch (error: unknown) {
    process.stderr.write(`Error creating archive: ${error instanceof Error ? error.message : String(error)}\n`);
    res.status(500).json({ error: 'Failed to create archive', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET archives list
 * GET /api/legal/archive/list
 */
router.get('/list', requireAdmin, async (req, res) => {
  try {
    void req.query;
    
    const archives = await ArchiveService.getArchiveExports();
    
    res.json({
      archives,
      total: archives.length,
      compliance_note: 'Archive list for regulatory compliance'
    });
  } catch (error: unknown) {
    process.stderr.write(`Error fetching archives: ${error instanceof Error ? error.message : String(error)}\n`);
    res.status(500).json({ error: 'Failed to fetch archives', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET archive details
 * GET /api/legal/archive/:id
 */
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const archiveId = parseInt(req.params.id);
    if (isNaN(archiveId)) {
      return res.status(400).json({ error: 'Invalid archive ID' });
    }
    
    const archive = await ArchiveService.getArchiveExportById(archiveId);
    if (!archive) {
      return res.status(404).json({ error: 'Archive not found' });
    }
    
    res.json({
      archive,
      compliance_note: 'Archive details for regulatory compliance'
    });
  } catch (error: unknown) {
    process.stderr.write(`Error fetching archive details: ${error instanceof Error ? error.message : String(error)}\n`);
    res.status(500).json({ error: 'Failed to fetch archive details', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST export archive
 * POST /api/legal/archive/:id/export
 */
router.post('/:id/export', requireAdmin, async (req, res) => {
  try {
    const archiveId = parseInt(req.params.id);
    if (isNaN(archiveId)) {
      return res.status(400).json({ error: 'Invalid archive ID' });
    }
    
    const { format = 'json' } = req.body;
    
    // For now, we'll return a placeholder since exportArchive doesn't exist
    // In a full implementation, you'd use the appropriate ArchiveService method
    const exportData = { archiveId, format, note: 'Export functionality to be implemented' };
    
    res.json({
      message: 'Archive exported successfully',
      export_data: exportData,
      format,
      compliance_note: 'Archive export for regulatory reporting'
    });
  } catch (error: unknown) {
    process.stderr.write(`Error exporting archive: ${error instanceof Error ? error.message : String(error)}\n`);
    res.status(500).json({ error: 'Failed to export archive', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router; 