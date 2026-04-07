import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getStatusResponse,
  testPrintResponse,
  printReceiptResponse,
  printClosureBulletinResponse
} from './printing';

const router = Router();

/** Ensure establishment context (same as printing router). */
const ensureEstablishment = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user || !user.establishment_id) {
    return res.status(400).json({ error: 'Establishment context required' });
  }
  next();
};

/**
 * Compatibility layer for existing thermal print endpoints.
 * Uses in-process calls to printing handlers (no self-HTTP).
 */

// POST /api/legal/receipt/:orderId/thermal-print
router.post('/api/legal/receipt/:orderId/thermal-print', authenticateToken, ensureEstablishment, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orderId = parseInt(req.params.orderId);
    const type = (req.query.type as string) || 'detailed';
    const { result, receiptData } = await printReceiptResponse(user, orderId, type);
    res.json({
      success: result.success,
      message: result.message,
      receipt_data: receiptData,
      receipt_content: result.metadata?.html || result.metadata?.content || ''
    });
  } catch (error: any) {
    const status = error?.statusCode === 404 ? 404 : 500;
    const data = status === 404 ? { error: 'Receipt not found' } : { error: (error?.message as string) || 'Printing failed' };
    res.status(status).json(data);
  }
});

// POST /api/legal/closure/:bulletinId/thermal-print
router.post('/api/legal/closure/:bulletinId/thermal-print', authenticateToken, ensureEstablishment, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const bulletinId = parseInt(req.params.bulletinId);
    const { result } = await printClosureBulletinResponse(user, bulletinId);
    res.json({
      success: result.success,
      message: result.message,
      bulletin_content: result.metadata?.html || result.metadata?.content || ''
    });
  } catch (error: any) {
    const status = error?.statusCode === 404 ? 404 : 500;
    const data = status === 404 ? { error: 'Closure bulletin not found' } : { error: (error?.message as string) || 'Printing failed' };
    res.status(status).json(data);
  }
});

// GET /api/legal/thermal-printer/status
router.get('/api/legal/thermal-printer/status', authenticateToken, ensureEstablishment, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const data = await getStatusResponse(user);
    res.json({
      available: data.status?.available ?? false,
      status: data.status?.status ?? 'Unknown'
    });
  } catch (error: any) {
    res.status(500).json({
      available: false,
      status: error?.message ?? 'Error checking printer'
    });
  }
});

// POST /api/legal/thermal-printer/test
router.post('/api/legal/thermal-printer/test', authenticateToken, ensureEstablishment, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await testPrintResponse(user, req.body?.printerId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: (error?.message as string) || 'Test print failed'
    });
  }
});

export default router;
