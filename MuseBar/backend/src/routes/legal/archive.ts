/**
 * Legal Archive Operations
 * Handles data archiving, retention, and compliance storage.
 * All read/write paths require an **establishment context** (no cross-tenant list or get-by-id).
 * Access is aligned with clôture (`access_closure`): fiscal-legal data stays tenant-scoped.
 */

import express from 'express';
import { ArchiveService } from '../../models/archiveService';
import { P } from '../../permissions/registry';
import { getEstablishmentId, requireAuth, requirePermission } from '../auth';
import { Logger } from '../../utils/logger';
import { AppError, asyncHandler } from '../../middleware/errorHandler';

const router = express.Router();
const logger = Logger.getInstance();

router.use(requireAuth, requirePermission(P.access_closure));

/**
 * POST create archive
 * POST /api/legal/archive/create
 */
router.post('/create', asyncHandler(async (req, res) => {
  try {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;

    const { archiveType, startDate, endDate } = req.body;
    
    if (!archiveType || !startDate || !endDate) {
      return res.status(400).json({ error: 'Archive type, start date, and end date are required' });
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
    logger.error(
      'Error creating archive',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_ARCHIVE'
    );
    throw new AppError('Failed to create archive', 500, 'LEGAL_ARCHIVE_CREATE_FAILED');
  }
}));

/**
 * GET archives list
 * GET /api/legal/archive/list
 */
router.get('/list', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    void req.query;
    
    const archives = await ArchiveService.getArchiveExports(establishmentId);
    
    res.json({
      archives,
      total: archives.length,
      compliance_note: 'Archive list for regulatory compliance'
    });
  } catch (error: unknown) {
    logger.error(
      'Error fetching archives',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_ARCHIVE'
    );
    throw new AppError('Failed to fetch archives', 500, 'LEGAL_ARCHIVE_LIST_FAILED');
  }
}));

/**
 * GET archive details
 * GET /api/legal/archive/:id
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const archiveId = parseInt(req.params.id);
    if (isNaN(archiveId)) {
      return res.status(400).json({ error: 'Invalid archive ID' });
    }
    
    const archive = await ArchiveService.getArchiveExportById(archiveId, establishmentId);
    if (!archive) {
      return res.status(404).json({ error: 'Archive not found' });
    }
    
    res.json({
      archive,
      compliance_note: 'Archive details for regulatory compliance'
    });
  } catch (error: unknown) {
    logger.error(
      'Error fetching archive details',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_ARCHIVE'
    );
    throw new AppError('Failed to fetch archive details', 500, 'LEGAL_ARCHIVE_DETAILS_FAILED');
  }
}));

/**
 * POST export archive
 * POST /api/legal/archive/:id/export
 */
router.post('/:id/export', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const archiveId = parseInt(req.params.id);
    if (isNaN(archiveId)) {
      return res.status(400).json({ error: 'Invalid archive ID' });
    }
    
    void archiveId;
    void req.body;

    res.status(501).json({
      error: 'Archive export is not implemented yet',
      code: 'LEGAL_ARCHIVE_EXPORT_NOT_IMPLEMENTED',
      compliance_note: 'Export endpoint is intentionally disabled until full implementation is available'
    });
  } catch (error: unknown) {
    logger.error(
      'Error exporting archive',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_ARCHIVE'
    );
    throw new AppError('Failed to export archive', 500, 'LEGAL_ARCHIVE_EXPORT_FAILED');
  }
}));

export default router; 