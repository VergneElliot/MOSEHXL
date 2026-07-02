import { Router, type Request, type Response } from 'express';

import { pool } from '../../db/pool';
import {
  ackBridgePrintJob,
  claimNextBridgePrintJob,
  failBridgePrintJob,
  getBridgeQueueStatus,
} from '../../printing/bridgePrintJobRepo';
import { getLogger } from '../../utils/logger';
import { asyncHandler, NotFoundError, ValidationError } from '../../middleware/errorHandler';
import { validateBridgeRequest } from './bridgeAuth';

const router = Router();

/**
 * MuseBar Print Bridge — local bridge polls cloud for durable ESC/POS jobs.
 * Secured by x-bridge-key; no browser JWT required.
 */
router.get('/bridge/poll', asyncHandler(async (req: Request, res: Response) => {
  const establishmentId = await validateBridgeRequest(req);
  const job = await claimNextBridgePrintJob(pool, establishmentId);
  if (!job) {
    return res.json({ job: null });
  }

  getLogger().info('PRINT_JOB_CLAIMED', {
    job_id: job.id,
    establishment_id: establishmentId,
    document_type: job.document_type,
  });

  return res.json({
    job: {
      id: job.id,
      document_type: job.document_type,
      payload_format: job.payload_format,
      payload_base64: job.payload_base64,
      attempt_count: job.attempt_count,
      metadata: job.metadata,
    },
  });
}));

router.post('/bridge/jobs/:jobId/ack', asyncHandler(async (req: Request, res: Response) => {
  const establishmentId = await validateBridgeRequest(req);
  const jobId = req.params.jobId;
  if (!jobId) {
    throw new ValidationError('Print job id is required');
  }

  const job = await ackBridgePrintJob(pool, establishmentId, jobId);
  if (!job) {
    throw new NotFoundError('Print job');
  }

  getLogger().info('PRINT_JOB_PRINTED', {
    job_id: job.id,
    establishment_id: establishmentId,
    document_type: job.document_type,
  });

  return res.json({ success: true, job_id: job.id, status: job.status });
}));

router.post('/bridge/jobs/:jobId/fail', asyncHandler(async (req: Request, res: Response) => {
  const establishmentId = await validateBridgeRequest(req);
  const jobId = req.params.jobId;
  if (!jobId) {
    throw new ValidationError('Print job id is required');
  }
  const errorMessage = typeof req.body?.error === 'string' && req.body.error.trim()
    ? req.body.error.trim()
    : 'Bridge reported print failure';

  const job = await failBridgePrintJob(pool, establishmentId, jobId, errorMessage);
  if (!job) {
    throw new NotFoundError('Print job');
  }

  getLogger().warn('PRINT_JOB_FAILED', {
    job_id: job.id,
    establishment_id: establishmentId,
    document_type: job.document_type,
    status: job.status,
  });

  return res.json({ success: true, job_id: job.id, status: job.status });
}));

router.get('/bridge/status', asyncHandler(async (req: Request, res: Response) => {
  const establishmentId = await validateBridgeRequest(req);
  const status = await getBridgeQueueStatus(pool, establishmentId);
  return res.json({ establishment_id: establishmentId, status });
}));

export default router;
