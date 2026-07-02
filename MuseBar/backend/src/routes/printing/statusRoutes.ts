import { Router, type Response } from 'express';

import { authenticateToken } from '../../middleware/auth';
import { getLogger } from '../../utils/logger';
import type { AuthenticatedRequest } from '../userManagement/types';
import { AppError, asyncHandler } from '../../middleware/errorHandler';
import { ensureEstablishment, getPrintingService, getPrintingUser } from './context';
import { getStatusResponse, testPrintResponse } from './handlers';

const router = Router();

// GET /api/printing/status
router.get('/status', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const data = await getStatusResponse(user);
    res.json(data);
  } catch (error) {
    getLogger().error('Error checking printer status', error instanceof Error ? error : undefined);
    throw new AppError('Failed to check printer status', 500, 'PRINTING_STATUS_FAILED');
  }
}));

// GET /api/printing/printers
router.get('/printers', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const service = await getPrintingService(user.establishment_id);

    const printers = await service.listPrinters();

    res.json({
      printers,
      establishment_id: user.establishment_id,
    });
  } catch (error) {
    getLogger().error('Error listing printers', error instanceof Error ? error : undefined);
    throw new AppError('Failed to list printers', 500, 'PRINTING_PRINTERS_FAILED');
  }
}));

// POST /api/printing/test
router.post('/test', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const result = await testPrintResponse(user, req.body?.printerId);
    res.json(result);
  } catch (error) {
    getLogger().error('Error test printing', error instanceof Error ? error : undefined);
    throw new AppError('Test print failed', 500, 'PRINTING_TEST_FAILED');
  }
}));

export default router;
