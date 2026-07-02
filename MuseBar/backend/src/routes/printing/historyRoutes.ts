import { Router, type Response } from 'express';

import { pool } from '../../db/pool';
import { authenticateToken } from '../../middleware/auth';
import { getLogger } from '../../utils/logger';
import type { AuthenticatedRequest } from '../userManagement/types';
import { AppError, asyncHandler } from '../../middleware/errorHandler';
import { ensureEstablishment, getPrintingUser } from './context';

const router = Router();

// GET /api/printing/history
router.get('/history', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const rawLimit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;
    const rawOffset = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) : 0;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 500) : 50;
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    const historyResult = await pool.query(
      `SELECT * FROM printing_history 
       WHERE establishment_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [user.establishment_id, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM printing_history WHERE establishment_id = $1`,
      [user.establishment_id]
    );

    res.json({
      history: historyResult.rows,
      total: parseInt(String(countResult.rows[0]?.count ?? '0'), 10),
      limit,
      offset,
    });
  } catch (error) {
    getLogger().error('Error getting printing history', error instanceof Error ? error : undefined);
    throw new AppError('Failed to get printing history', 500, 'PRINTING_HISTORY_FETCH_FAILED');
  }
}));

export default router;
