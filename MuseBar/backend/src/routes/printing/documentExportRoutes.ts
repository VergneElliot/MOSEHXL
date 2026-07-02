import { Router, type Response } from 'express';

import { pool } from '../../db/pool';
import { authenticateToken } from '../../middleware/auth';
import {
  buildClosureBulletinData,
  buildReceiptDataForInvoice,
  buildReceiptDataForOrder,
  logPrintingHistory,
} from '../../printing/printDataRepo';
import {
  renderClosureBulletinPdf,
  renderReceiptOrInvoicePdf,
} from '../../services/documents/documentPdfService';
import {
  buildClosureExportData,
  buildClosurePdfFilename,
  buildClosureXlsxAttachment,
} from '../../services/documents/closureXlsxService';
import {
  emailClosureBulletinDocument,
  emailReceiptDocument,
  validateRecipientEmail,
} from '../../services/documents/documentEmailService';
import type { AuthenticatedRequest } from '../userManagement/types';
import { asyncHandler, ValidationError } from '../../middleware/errorHandler';
import { ensureEstablishment, getPrintingUser } from './context';
import { mapDocumentRouteError, sendPdfDownload, sendXlsxDownload } from './documentHelpers';

const router = Router();

// GET /api/printing/receipt/:orderId/export-pdf
router.get('/receipt/:orderId/export-pdf', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const orderId = parseInt(req.params.orderId ?? '', 10);
    if (!Number.isFinite(orderId) || orderId <= 0) throw new ValidationError('Invalid order id');
    const type = typeof req.query.type === 'string' ? req.query.type : 'detailed';
    const receiptData = await buildReceiptDataForOrder(pool, user.establishment_id, user, orderId, type);
    const pdf = await renderReceiptOrInvoicePdf(receiptData);
    sendPdfDownload(res, pdf, `ticket-${receiptData.document_number ?? orderId}.pdf`);
  } catch (error) {
    mapDocumentRouteError(error, 'PRINTING_RECEIPT_EXPORT_FAILED');
  }
}));

// POST /api/printing/receipt/:orderId/email
router.post('/receipt/:orderId/email', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const orderId = parseInt(req.params.orderId ?? '', 10);
    if (!Number.isFinite(orderId) || orderId <= 0) throw new ValidationError('Invalid order id');
    const type = typeof req.query.type === 'string' ? req.query.type : 'detailed';
    const receiptData = await buildReceiptDataForOrder(pool, user.establishment_id, user, orderId, type);
    const to = validateRecipientEmail(req.body?.to);
    const result = await emailReceiptDocument(receiptData, to);
    await logPrintingHistory(pool, user.establishment_id, 'receipt', { success: true, message: result.message }, {
      order_id: orderId,
      action: 'email',
      recipient: to,
      tracking_id: result.trackingId,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    mapDocumentRouteError(error, 'PRINTING_RECEIPT_EMAIL_FAILED');
  }
}));

// GET /api/printing/invoice/:invoiceId/export-pdf
router.get('/invoice/:invoiceId/export-pdf', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const invoiceId = parseInt(req.params.invoiceId ?? '', 10);
    if (!Number.isFinite(invoiceId) || invoiceId <= 0) throw new ValidationError('Invalid invoice id');
    const invoiceData = await buildReceiptDataForInvoice(pool, user, invoiceId);
    const pdf = await renderReceiptOrInvoicePdf(invoiceData);
    sendPdfDownload(res, pdf, `${invoiceData.document_number ?? `invoice-${invoiceId}`}.pdf`);
  } catch (error) {
    mapDocumentRouteError(error, 'PRINTING_INVOICE_EXPORT_FAILED');
  }
}));

// POST /api/printing/invoice/:invoiceId/email
router.post('/invoice/:invoiceId/email', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const invoiceId = parseInt(req.params.invoiceId ?? '', 10);
    if (!Number.isFinite(invoiceId) || invoiceId <= 0) throw new ValidationError('Invalid invoice id');
    const invoiceData = await buildReceiptDataForInvoice(pool, user, invoiceId);
    const to = validateRecipientEmail(req.body?.to ?? invoiceData.customer_info?.email);
    const result = await emailReceiptDocument(invoiceData, to);
    await logPrintingHistory(pool, user.establishment_id, 'invoice', { success: true, message: result.message }, {
      invoice_id: invoiceId,
      action: 'email',
      recipient: to,
      tracking_id: result.trackingId,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    mapDocumentRouteError(error, 'PRINTING_INVOICE_EMAIL_FAILED');
  }
}));

// GET /api/printing/closure/:bulletinId/export-pdf
router.get('/closure/:bulletinId/export-pdf', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const bulletinId = parseInt(req.params.bulletinId ?? '', 10);
    if (!Number.isFinite(bulletinId) || bulletinId <= 0) throw new ValidationError('Invalid closure bulletin id');
    const bulletinData = await buildClosureBulletinData(pool, user, bulletinId);
    const exportData = await buildClosureExportData(pool, user.establishment_id, bulletinData);
    const pdf = await renderClosureBulletinPdf(bulletinData, exportData);
    sendPdfDownload(res, pdf, buildClosurePdfFilename(bulletinData));
  } catch (error) {
    mapDocumentRouteError(error, 'PRINTING_CLOSURE_EXPORT_FAILED');
  }
}));

// GET /api/printing/closure/:bulletinId/export-xlsx
router.get('/closure/:bulletinId/export-xlsx', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const bulletinId = parseInt(req.params.bulletinId ?? '', 10);
    if (!Number.isFinite(bulletinId) || bulletinId <= 0) throw new ValidationError('Invalid closure bulletin id');
    const bulletinData = await buildClosureBulletinData(pool, user, bulletinId);
    const exportData = await buildClosureExportData(pool, user.establishment_id, bulletinData);
    const xlsx = await buildClosureXlsxAttachment(pool, user.establishment_id, bulletinData, exportData);
    sendXlsxDownload(res, xlsx.buffer, xlsx.filename);
  } catch (error) {
    mapDocumentRouteError(error, 'PRINTING_CLOSURE_XLSX_EXPORT_FAILED');
  }
}));

// POST /api/printing/closure/:bulletinId/email
router.post('/closure/:bulletinId/email', authenticateToken, ensureEstablishment, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getPrintingUser(req)!;
    const bulletinId = parseInt(req.params.bulletinId ?? '', 10);
    if (!Number.isFinite(bulletinId) || bulletinId <= 0) throw new ValidationError('Invalid closure bulletin id');
    const bulletinData = await buildClosureBulletinData(pool, user, bulletinId);
    const to = validateRecipientEmail(req.body?.to);
    const result = await emailClosureBulletinDocument(pool, user.establishment_id, bulletinData, to);
    await logPrintingHistory(pool, user.establishment_id, 'closure_bulletin', { success: true, message: result.message }, {
      bulletin_id: bulletinId,
      action: 'email',
      recipient: to,
      tracking_id: result.trackingId,
      attachments: result.attachments,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    mapDocumentRouteError(error, 'PRINTING_CLOSURE_EMAIL_FAILED');
  }
}));

export default router;
