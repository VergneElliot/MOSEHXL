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
import { AppError, asyncHandler, NotFoundError, ValidationError } from '../../middleware/errorHandler';

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
      throw new ValidationError('Archive type, start date, and end date are required');
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
    if (error instanceof AppError) throw error;
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
    const archiveId = parseInt(req.params.id ?? '', 10);
    if (isNaN(archiveId)) {
      throw new ValidationError('Invalid archive ID');
    }
    
    const archive = await ArchiveService.getArchiveExportById(archiveId, establishmentId);
    if (!archive) {
      throw new NotFoundError('Archive');
    }
    
    res.json({
      archive,
      compliance_note: 'Archive details for regulatory compliance'
    });
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error(
      'Error fetching archive details',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_ARCHIVE'
    );
    throw new AppError('Failed to fetch archive details', 500, 'LEGAL_ARCHIVE_DETAILS_FAILED');
  }
}));

/**
 * POST verify archive integrity/signature
 * POST /api/legal/archive/:id/verify
 */
router.post('/:id/verify', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const archiveId = parseInt(req.params.id ?? '', 10);
    if (isNaN(archiveId)) {
      throw new ValidationError('Invalid archive ID');
    }

    const verification = await ArchiveService.verifyArchiveExport(archiveId, establishmentId);
    if (!verification.isValid && verification.errors.includes('Archive export not found')) {
      throw new NotFoundError('Archive');
    }

    res.json({
      archive_id: archiveId,
      ...verification,
      compliance_note: 'Archive integrity and signature verification result'
    });
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error(
      'Error verifying archive',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_ARCHIVE'
    );
    throw new AppError('Failed to verify archive', 500, 'LEGAL_ARCHIVE_VERIFY_FAILED');
  }
}));

/**
 * GET download archive file
 * GET /api/legal/archive/:id/download
 */
router.get('/:id/download', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const archiveId = parseInt(req.params.id ?? '', 10);
    if (isNaN(archiveId)) {
      throw new ValidationError('Invalid archive ID');
    }

    const download = await ArchiveService.downloadArchiveExport(archiveId, establishmentId);
    if (!download) {
      throw new NotFoundError('Archive file');
    }

    return res.download(download.filePath, download.fileName);
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error(
      'Error downloading archive',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_ARCHIVE'
    );
    throw new AppError('Failed to download archive', 500, 'LEGAL_ARCHIVE_DOWNLOAD_FAILED');
  }
}));

/**
 * POST export archive (legacy alias to download route)
 * POST /api/legal/archive/:id/export
 */
router.post('/:id/export', asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  try {
    const archiveId = parseInt(req.params.id ?? '', 10);
    if (isNaN(archiveId)) {
      throw new ValidationError('Invalid archive ID');
    }

    const download = await ArchiveService.downloadArchiveExport(archiveId, establishmentId);
    if (!download) {
      throw new NotFoundError('Archive file');
    }

    res.setHeader('Deprecation', 'true');
    return res.download(download.filePath, download.fileName);
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error(
      'Error exporting archive',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_ARCHIVE'
    );
    throw new AppError('Failed to export archive', 500, 'LEGAL_ARCHIVE_EXPORT_FAILED');
  }
}));

export default router; 