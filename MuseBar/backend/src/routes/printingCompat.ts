import { Router, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import type { AuthenticatedRequest } from './userManagement/types';
import {
  getStatusResponse,
  testPrintResponse,
  printReceiptResponse,
  printClosureBulletinResponse
} from './printing';
import { AppError, asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';

const router = Router();

/** Ensure establishment context (same as printing router). */
type PrintingUser = { establishment_id: string; id: number; username?: string };

function getPrintingUser(req: AuthenticatedRequest): PrintingUser | null {
  const establishmentIdRaw = req.user?.establishment_id;
  const establishmentId = typeof establishmentIdRaw === 'string' ? establishmentIdRaw : null;
  if (!establishmentId) return null;
  if (!req.user) return null;
  return { establishment_id: establishmentId, id: req.user.id, username: (req.user as { username?: string } | undefined)?.username };
}

const ensureEstablishment = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = getPrintingUser(req);
  if (!user) {
    throw new ValidationError('Establishment context required');
  }
  void res;
  next();
};

/**
 * Compatibility layer for existing thermal print endpoints.
 * Uses in-process calls to printing handlers (no self-HTTP).
 */

// POST /api/legal/receipt/:orderId/thermal-print
router.post('/api/legal/receipt/:orderId/thermal-print', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const orderId = parseInt(req.params.orderId ?? '', 10);
    const type = typeof req.query.type === 'string' ? req.query.type : 'detailed';
    const { result, receiptData } = await printReceiptResponse(user, orderId, type);
    const r = result as { success?: boolean; message?: string; metadata?: Record<string, unknown> };
    res.json({
      success: Boolean(r.success),
      message: r.message,
      receipt_data: receiptData,
      receipt_content: (r.metadata as { html?: unknown; content?: unknown } | undefined)?.html ||
        (r.metadata as { html?: unknown; content?: unknown } | undefined)?.content ||
        ''
    });
  } catch (error: unknown) {
    const e = error as { statusCode?: number; message?: string };
    if (e?.statusCode === 404) {
      throw new NotFoundError('Receipt');
    }
    throw new AppError(e?.message || 'Printing failed', 500, 'PRINTING_COMPAT_RECEIPT_FAILED');
  }
}));

// POST /api/legal/closure/:bulletinId/thermal-print
router.post('/api/legal/closure/:bulletinId/thermal-print', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const bulletinId = parseInt(req.params.bulletinId ?? '', 10);
    const { result } = await printClosureBulletinResponse(user, bulletinId);
    const r = result as { success?: boolean; message?: string; metadata?: Record<string, unknown> };
    res.json({
      success: Boolean(r.success),
      message: r.message,
      bulletin_content: (r.metadata as { html?: unknown; content?: unknown } | undefined)?.html ||
        (r.metadata as { html?: unknown; content?: unknown } | undefined)?.content ||
        ''
    });
  } catch (error: unknown) {
    const e = error as { statusCode?: number; message?: string };
    if (e?.statusCode === 404) {
      throw new NotFoundError('Closure bulletin');
    }
    throw new AppError(e?.message || 'Printing failed', 500, 'PRINTING_COMPAT_CLOSURE_FAILED');
  }
}));

// GET /api/legal/thermal-printer/status
router.get('/api/legal/thermal-printer/status', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const data = await getStatusResponse(user);
    res.json({
      available: data.status?.available ?? false,
      status: data.status?.status ?? 'Unknown'
    });
  } catch (error: unknown) {
    throw new AppError(
      error instanceof Error ? error.message : 'Error checking printer',
      500,
      'PRINTING_COMPAT_STATUS_FAILED'
    );
  }
}));

// POST /api/legal/thermal-printer/test
router.post('/api/legal/thermal-printer/test', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const result = await testPrintResponse(user, req.body?.printerId);
    res.json(result);
  } catch (error: unknown) {
    throw new AppError(
      error instanceof Error ? error.message : 'Test print failed',
      500,
      'PRINTING_COMPAT_TEST_FAILED'
    );
  }
}));

export default router;
