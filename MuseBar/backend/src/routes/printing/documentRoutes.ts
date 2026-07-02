import { Router, type Response } from 'express';

import { pool } from '../../db/pool';
import { authenticateToken } from '../../middleware/auth';
import {
  buildClosureBulletinData,
  buildReceiptDataForInvoice,
  buildReceiptDataForOrder,
} from '../../printing/printDataRepo';
import { getLogger } from '../../utils/logger';
import type { AuthenticatedRequest } from '../userManagement/types';
import { AppError, asyncHandler, NotFoundError, ValidationError } from '../../middleware/errorHandler';
import { ensureEstablishment, getPrintingUser } from './context';
import {
  printClosureBulletinResponse,
  printInvoiceResponse,
  printReceiptResponse,
} from './handlers';

const router = Router();

// GET /api/printing/receipt/:orderId/preview
router.get('/receipt/:orderId/preview', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const orderId = parseInt(req.params.orderId ?? '', 10);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      throw new ValidationError('Invalid order id');
    }
    const type = typeof req.query.type === 'string' ? req.query.type : 'detailed';
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
    const orderId = parseInt(req.params.orderId ?? '', 10);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      throw new ValidationError('Invalid order id');
    }
    const type = typeof req.query.type === 'string' ? req.query.type : 'detailed';
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

// GET /api/printing/closure/:bulletinId/preview
router.get('/closure/:bulletinId/preview', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const bulletinId = parseInt(req.params.bulletinId ?? '', 10);
    if (!Number.isFinite(bulletinId) || bulletinId <= 0) {
      throw new ValidationError('Invalid closure bulletin id');
    }
    const bulletinData = await buildClosureBulletinData(pool, user, bulletinId);
    res.json({ bulletin_data: bulletinData });
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    const e = error as { statusCode?: number; message?: string };
    if (e?.statusCode === 404) {
      throw new NotFoundError('Closure bulletin');
    }
    getLogger().error('Error generating closure preview', error instanceof Error ? error : undefined);
    throw new AppError(
      e?.message ?? (error instanceof Error ? error.message : 'Unknown error'),
      500,
      'PRINTING_CLOSURE_PREVIEW_FAILED'
    );
  }
}));

// POST /api/printing/closure/:bulletinId
router.post('/closure/:bulletinId', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const bulletinId = parseInt(req.params.bulletinId ?? '', 10);
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

// GET /api/printing/invoice/:invoiceId/preview
router.get('/invoice/:invoiceId/preview', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const invoiceId = parseInt(req.params.invoiceId ?? '', 10);
    if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
      throw new ValidationError('Invalid invoice id');
    }
    const invoiceData = await buildReceiptDataForInvoice(pool, user, invoiceId);
    res.json({ invoice_data: invoiceData });
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    const e = error as { statusCode?: number; message?: string };
    if (e?.statusCode === 404) {
      throw new NotFoundError('Invoice');
    }
    if (e?.statusCode === 422) {
      throw new ValidationError(e.message ?? 'Invoice compliance validation failed');
    }
    getLogger().error('Error generating invoice preview', error instanceof Error ? error : undefined);
    throw new AppError(
      e?.message ?? (error instanceof Error ? error.message : 'Unknown error'),
      500,
      'PRINTING_INVOICE_PREVIEW_FAILED'
    );
  }
}));

// POST /api/printing/invoice/:invoiceId
router.post('/invoice/:invoiceId', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const invoiceId = parseInt(req.params.invoiceId ?? '', 10);
    if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
      throw new ValidationError('Invalid invoice id');
    }
    const { result, invoiceData } = await printInvoiceResponse(user, invoiceId);
    res.json({ ...result, invoice_data: invoiceData });
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    const e = error as { statusCode?: number; message?: string };
    if (e?.statusCode === 404) {
      throw new NotFoundError('Invoice');
    }
    if (e?.statusCode === 422) {
      throw new ValidationError(e.message ?? 'Invoice compliance validation failed');
    }
    getLogger().error('Error printing invoice', error instanceof Error ? error : undefined);
    throw new AppError(
      e?.message ?? (error instanceof Error ? error.message : 'Unknown error'),
      500,
      'PRINTING_INVOICE_FAILED'
    );
  }
}));

export default router;
