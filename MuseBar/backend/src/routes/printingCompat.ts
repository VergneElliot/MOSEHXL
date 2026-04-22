import { Router, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import type { AuthenticatedRequest } from './userManagement/types';
import {
  getStatusResponse,
  testPrintResponse,
  printReceiptResponse,
  printClosureBulletinResponse
} from './printing';

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
    return res.status(400).json({ error: 'Establishment context required' });
  }
  next();
};

/**
 * Compatibility layer for existing thermal print endpoints.
 * Uses in-process calls to printing handlers (no self-HTTP).
 */

// POST /api/legal/receipt/:orderId/thermal-print
router.post('/api/legal/receipt/:orderId/thermal-print', authenticateToken, ensureEstablishment, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const orderId = parseInt(req.params.orderId);
    const type = (req.query.type as string) || 'detailed';
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
    const status = e?.statusCode === 404 ? 404 : 500;
    const data = status === 404 ? { error: 'Receipt not found' } : { error: e?.message || 'Printing failed' };
    res.status(status).json(data);
  }
});

// POST /api/legal/closure/:bulletinId/thermal-print
router.post('/api/legal/closure/:bulletinId/thermal-print', authenticateToken, ensureEstablishment, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const bulletinId = parseInt(req.params.bulletinId);
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
    const status = e?.statusCode === 404 ? 404 : 500;
    const data = status === 404 ? { error: 'Closure bulletin not found' } : { error: e?.message || 'Printing failed' };
    res.status(status).json(data);
  }
});

// GET /api/legal/thermal-printer/status
router.get('/api/legal/thermal-printer/status', authenticateToken, ensureEstablishment, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const data = await getStatusResponse(user);
    res.json({
      available: data.status?.available ?? false,
      status: data.status?.status ?? 'Unknown'
    });
  } catch (error: unknown) {
    res.status(500).json({
      available: false,
      status: error instanceof Error ? error.message : 'Error checking printer'
    });
  }
});

// POST /api/legal/thermal-printer/test
router.post('/api/legal/thermal-printer/test', authenticateToken, ensureEstablishment, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const result = await testPrintResponse(user, req.body?.printerId);
    res.json(result);
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Test print failed'
    });
  }
});

export default router;
