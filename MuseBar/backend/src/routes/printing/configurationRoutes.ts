import { Router, type Response } from 'express';

import { pool } from '../../db/pool';
import { authenticateToken } from '../../middleware/auth';
import {
  listPrintingConfigurations,
  savePrintingConfiguration,
} from '../../printing/printingConfigRepo';
import { logSoftwareEventBestEffort } from '../../services/legal/softwareEventJournal';
import { getLogger } from '../../utils/logger';
import type { AuthenticatedRequest } from '../userManagement/types';
import { AppError, asyncHandler, ValidationError } from '../../middleware/errorHandler';
import { ensureEstablishment, getPrintingUser, printingServiceManager } from './context';

const router = Router();

// GET /api/printing/configuration
router.get('/configuration', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;

    const configurations = await listPrintingConfigurations(pool, user.establishment_id);
    res.json({
      configurations,
      establishment_id: user.establishment_id,
    });
  } catch (error) {
    getLogger().error('Error getting printing configuration', error instanceof Error ? error : undefined);
    throw new AppError(
      'Failed to get printing configuration',
      500,
      'PRINTING_CONFIG_FETCH_FAILED'
    );
  }
}));

// POST /api/printing/configuration
router.post('/configuration', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const { provider, config: bodyConfig } = req.body;

    if (!provider) {
      throw new ValidationError('Provider is required');
    }

    const { configuration } = await savePrintingConfiguration(
      pool,
      user.establishment_id,
      provider,
      bodyConfig
    );
    printingServiceManager.clearPrintingService(user.establishment_id);
    await logSoftwareEventBestEffort({
      establishmentId: user.establishment_id,
      eventType: 'PRINTING_CONFIGURATION_UPDATED',
      userId: String(user.id),
      eventData: {
        provider,
        has_config_payload: bodyConfig != null,
      },
    });

    res.json({
      configuration,
      message: 'Printing configuration updated successfully',
    });
  } catch (error) {
    const e = error as { statusCode?: number; message?: string };
    if (e?.statusCode === 400) {
      throw new ValidationError(e.message ?? 'Invalid printing configuration');
    }
    getLogger().error('Error updating printing configuration', error instanceof Error ? error : undefined);
    throw new AppError(
      e?.message ?? (error instanceof Error ? error.message : 'Unknown error'),
      500,
      'PRINTING_CONFIG_UPDATE_FAILED'
    );
  }
}));

export default router;
