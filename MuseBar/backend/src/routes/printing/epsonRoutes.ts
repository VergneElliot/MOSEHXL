import { Router, type Request, type Response } from 'express';

import { pool } from '../../db/pool';
import { epsonServerDirectPollHandler } from '../../printing/epsonPollHandler';
import { getLogger } from '../../utils/logger';
import { AppError, asyncHandler } from '../../middleware/errorHandler';

const router = Router();

/**
 * Epson TM-Intelligent — Server Direct Print poll (no JWT; secured with x-epson-poll-key header).
 * Configure this full URL in the printer TMNet WebConfig.
 */
router.get('/epson/poll', asyncHandler(async (req: Request, res: Response) => {
  try {
    return await epsonServerDirectPollHandler(pool, req, res);
  } catch (error) {
    getLogger().error('Epson Server Direct poll error', error instanceof Error ? error : undefined);
    throw new AppError('Internal error', 500, 'EPSON_POLL_FAILED');
  }
}));

export default router;
