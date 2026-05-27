import { Router, Response, NextFunction, Request } from 'express';
import type { PrintingConfig, IPrintingService } from '../services/printing';
import type { PrintResult, ReceiptData as PrintingReceiptData, ClosureBulletinData as PrintingClosureBulletinData } from '../services/printing/types';
import { pool } from '../db/pool';
import { authenticateToken } from '../middleware/auth';
import { getLogger } from '../utils/logger';
import type { AuthenticatedRequest } from './userManagement/types';
import { epsonServerDirectPollHandler } from '../printing/epsonPollHandler';
import {
  ALLOWED_PRINT_PROVIDERS,
  listPrintingConfigurations,
  savePrintingConfiguration,
  parseConfigCell,
} from '../printing/printingConfigRepo';
import {
  buildClosureBulletinData,
  buildReceiptDataForOrder,
  buildTestReceiptData,
  logPrintingHistory,
  PrintingUser,
} from '../printing/printDataRepo';
import { createPrintingServiceManager } from '../printing/printingServiceManager';
import { logSoftwareEventBestEffort } from '../services/legal/softwareEventJournal';
import { AppError, asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';

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

const printingServiceManager = createPrintingServiceManager(pool, getLogger());

function getPrintingUser(req: AuthenticatedRequest): PrintingUser | null {
  const establishmentIdRaw = req.user?.establishment_id;
  const establishmentId = typeof establishmentIdRaw === 'string' ? establishmentIdRaw : null;
  if (!establishmentId) return null;
  if (!req.user) return null;
  return {
    establishment_id: establishmentId,
    id: req.user.id,
    username: (req.user as { username?: string }).username,
  };
}

/**
 * Get printing service for establishment
 */
async function getPrintingService(establishmentId: string): Promise<IPrintingService> {
  // Backwards-compatible wrapper so other code in this file doesn't change shape.
  return await printingServiceManager.getPrintingService(establishmentId);
}

// Middleware to ensure establishment context
const ensureEstablishment = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = getPrintingUser(req);
  if (!user) {
    throw new ValidationError('Establishment context required');
  }
  void res;
  next();
};

/** In-process handler: get status and printers. Used by routes and by printingCompat. */
export async function getStatusResponse(user: PrintingUser) {
  const service = await getPrintingService(user.establishment_id);
  const status = await service.checkPrinterStatus();
  const printers = await service.listPrinters();
  return { status, printers, establishment_id: user.establishment_id };
}

/** In-process handler: test print. Used by routes and by printingCompat. */
export async function testPrintResponse(user: PrintingUser, printerId?: string) {
  void printerId;
  const service = await getPrintingService(user.establishment_id);

  const testData = await buildTestReceiptData(pool, user);
  const result = await service.printReceipt(testData);
  return {
    ...result,
    message: result.success ? 'Test print queued successfully' : `Test print failed: ${result.message}`,
  };
}

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
      establishment_id: user.establishment_id
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

/** In-process handler: print receipt. Used by routes and by printingCompat. */
export async function printReceiptResponse(
  user: PrintingUser,
  orderId: number,
  type: string = 'detailed'
): Promise<{ result: PrintResult; receiptData: PrintingReceiptData }> {
  const establishmentId = user.establishment_id;
  const receiptData = await buildReceiptDataForOrder(pool, establishmentId, user, orderId, type);
  const service = await getPrintingService(user.establishment_id);
  const result = await service.printReceipt(receiptData);
  await logPrintingHistory(pool, user.establishment_id, 'receipt', result, {
    order_id: orderId,
    receipt_number: receiptData.sequence_number,
  });
  return { result, receiptData };
}

/** In-process handler: print closure bulletin. Used by routes and by printingCompat. */
export async function printClosureBulletinResponse(
  user: PrintingUser,
  bulletinId: number
): Promise<{ result: PrintResult; bulletinData: PrintingClosureBulletinData }> {
  const bulletinData = await buildClosureBulletinData(pool, user, bulletinId);
  const service = await getPrintingService(user.establishment_id);
  const result = await service.printClosureBulletin(bulletinData);
  await logPrintingHistory(pool, user.establishment_id, 'closure_bulletin', result, {
    bulletin_id: bulletinId,
    closure_type: bulletinData.closure_type,
  });
  return { result, bulletinData };
}

// GET /api/printing/receipt/:orderId/preview
// Preview-only: returns receipt_data but DOES NOT queue a print job.
router.get('/receipt/:orderId/preview', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const orderId = parseInt(req.params.orderId, 10);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      throw new ValidationError('Invalid order id');
    }
    const type = (req.query.type as string) || 'detailed';
    const receiptData = await buildReceiptDataForOrder(pool, user.establishment_id, user, orderId, type);
    res.json({ receipt_data: receiptData });
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    const e = error as { statusCode?: number; message?: string };
    if (e?.statusCode === 404) {
      throw new NotFoundError('Receipt');
    }
    getLogger().error('Error generating receipt preview', error instanceof Error ? error : undefined);
    throw new AppError(
      e?.message ?? (error instanceof Error ? error.message : 'Unknown error'),
      500,
      'PRINTING_RECEIPT_PREVIEW_FAILED'
    );
  }
}));

// POST /api/printing/receipt/:orderId
router.post('/receipt/:orderId', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const orderId = parseInt(req.params.orderId, 10);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      throw new ValidationError('Invalid order id');
    }
    const type = (req.query.type as string) || 'detailed';
    const { result, receiptData } = await printReceiptResponse(user, orderId, type);
    res.json({ ...result, receipt_data: receiptData });
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    const e = error as { statusCode?: number; message?: string };
    if (e?.statusCode === 404) {
      throw new NotFoundError('Receipt');
    }
    getLogger().error('Error printing receipt', error instanceof Error ? error : undefined);
    throw new AppError(
      e?.message ?? (error instanceof Error ? error.message : 'Unknown error'),
      500,
      'PRINTING_RECEIPT_FAILED'
    );
  }
}));

// POST /api/printing/closure/:bulletinId
router.post('/closure/:bulletinId', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const bulletinId = parseInt(req.params.bulletinId, 10);
    if (!Number.isFinite(bulletinId) || bulletinId <= 0) {
      throw new ValidationError('Invalid closure bulletin id');
    }
    const { result, bulletinData } = await printClosureBulletinResponse(user, bulletinId);
    res.json({ ...result, bulletin_data: bulletinData });
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    const e = error as { statusCode?: number; message?: string };
    if (e?.statusCode === 404) {
      throw new NotFoundError('Closure bulletin');
    }
    getLogger().error('Error printing closure bulletin', error instanceof Error ? error : undefined);
    throw new AppError(
      e?.message ?? (error instanceof Error ? error.message : 'Unknown error'),
      500,
      'PRINTING_CLOSURE_FAILED'
    );
  }
}));

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
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    });
  } catch (error) {
    getLogger().error('Error getting printing history', error instanceof Error ? error : undefined);
    throw new AppError('Failed to get printing history', 500, 'PRINTING_HISTORY_FETCH_FAILED');
  }
}));

// Export router
export default router;
