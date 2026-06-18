import { timingSafeEqual } from 'crypto';
import { Router, Response, NextFunction, Request } from 'express';
import type { Response as ExpressResponse } from 'express';
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
  getActiveBridgeConfiguration,
} from '../printing/printingConfigRepo';
import {
  ackBridgePrintJob,
  claimNextBridgePrintJob,
  failBridgePrintJob,
  getBridgeQueueStatus,
} from '../printing/bridgePrintJobRepo';
import {
  buildClosureBulletinData,
  buildReceiptDataForInvoice,
  buildReceiptDataForOrder,
  buildTestReceiptData,
  logPrintingHistory,
  PrintingUser,
} from '../printing/printDataRepo';
import { createPrintingServiceManager } from '../printing/printingServiceManager';
import { logSoftwareEventBestEffort } from '../services/legal/softwareEventJournal';
import { AppError, asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  renderClosureBulletinPdf,
  renderReceiptOrInvoicePdf,
} from '../services/documents/documentPdfService';
import {
  buildClosureExportData,
  buildClosurePdfFilename,
  buildClosureXlsxAttachment,
} from '../services/documents/closureXlsxService';
import {
  emailClosureBulletinDocument,
  emailReceiptDocument,
  validateRecipientEmail,
} from '../services/documents/documentEmailService';

const router = Router();

function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

async function validateBridgeRequest(req: Request): Promise<string> {
  const establishmentId = typeof req.query.establishment_id === 'string'
    ? req.query.establishment_id.trim()
    : '';
  const bridgeKey = typeof req.headers['x-bridge-key'] === 'string'
    ? req.headers['x-bridge-key'].trim()
    : '';

  if (!establishmentId || !bridgeKey) {
    throw new AppError('Bridge authentication required', 401, 'BRIDGE_AUTH_REQUIRED');
  }

  const config = await getActiveBridgeConfiguration(pool, establishmentId);
  const expected = typeof config?.bridgeKey === 'string' ? config.bridgeKey : '';
  if (!expected || !safeEquals(bridgeKey, expected)) {
    getLogger().warn('Bridge authentication failed');
    throw new AppError('Invalid bridge key', 401, 'BRIDGE_AUTH_FAILED');
  }

  return establishmentId;
}

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

/**
 * MuseBar Print Bridge — local bridge polls cloud for durable ESC/POS jobs.
 * Secured by x-bridge-key; no browser JWT required.
 */
router.get('/bridge/poll', asyncHandler(async (req: Request, res: Response) => {
  const establishmentId = await validateBridgeRequest(req);
  const job = await claimNextBridgePrintJob(pool, establishmentId);
  if (!job) {
    return res.json({ job: null });
  }

  getLogger().info('PRINT_JOB_CLAIMED', {
    job_id: job.id,
    establishment_id: establishmentId,
    document_type: job.document_type,
  });

  return res.json({
    job: {
      id: job.id,
      document_type: job.document_type,
      payload_format: job.payload_format,
      payload_base64: job.payload_base64,
      attempt_count: job.attempt_count,
      metadata: job.metadata,
    },
  });
}));

router.post('/bridge/jobs/:jobId/ack', asyncHandler(async (req: Request, res: Response) => {
  const establishmentId = await validateBridgeRequest(req);
  const jobId = req.params.jobId;
  if (!jobId) {
    throw new ValidationError('Print job id is required');
  }

  const job = await ackBridgePrintJob(pool, establishmentId, jobId);
  if (!job) {
    throw new NotFoundError('Print job');
  }

  getLogger().info('PRINT_JOB_PRINTED', {
    job_id: job.id,
    establishment_id: establishmentId,
    document_type: job.document_type,
  });

  return res.json({ success: true, job_id: job.id, status: job.status });
}));

router.post('/bridge/jobs/:jobId/fail', asyncHandler(async (req: Request, res: Response) => {
  const establishmentId = await validateBridgeRequest(req);
  const jobId = req.params.jobId;
  if (!jobId) {
    throw new ValidationError('Print job id is required');
  }
  const errorMessage = typeof req.body?.error === 'string' && req.body.error.trim()
    ? req.body.error.trim()
    : 'Bridge reported print failure';

  const job = await failBridgePrintJob(pool, establishmentId, jobId, errorMessage);
  if (!job) {
    throw new NotFoundError('Print job');
  }

  getLogger().warn('PRINT_JOB_FAILED', {
    job_id: job.id,
    establishment_id: establishmentId,
    document_type: job.document_type,
    status: job.status,
  });

  return res.json({ success: true, job_id: job.id, status: job.status });
}));

router.get('/bridge/status', asyncHandler(async (req: Request, res: Response) => {
  const establishmentId = await validateBridgeRequest(req);
  const status = await getBridgeQueueStatus(pool, establishmentId);
  return res.json({ establishment_id: establishmentId, status });
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

/** In-process handler: print invoice. */
export async function printInvoiceResponse(
  user: PrintingUser,
  invoiceId: number
): Promise<{ result: PrintResult; invoiceData: PrintingReceiptData }> {
  const invoiceData = await buildReceiptDataForInvoice(pool, user, invoiceId);
  const service = await getPrintingService(user.establishment_id);
  const result = await service.printReceipt(invoiceData);
  await logPrintingHistory(pool, user.establishment_id, 'invoice', result, {
    invoice_id: invoiceId,
    invoice_number: invoiceData.document_number,
    invoice_sequence: invoiceData.sequence_number,
  });
  return { result, invoiceData };
}

// GET /api/printing/receipt/:orderId/preview
// Preview-only: returns receipt_data but DOES NOT queue a print job.
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

// POST /api/printing/closure/:bulletinId
// Preview-only: returns bulletin_data but DOES NOT queue a print job.
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
// Preview-only: returns invoice_data but DOES NOT queue a print job.
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

function sendPdfDownload(res: ExpressResponse, buffer: Buffer, filename: string): void {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

function sendXlsxDownload(res: ExpressResponse, buffer: Buffer, filename: string): void {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

function mapDocumentRouteError(error: unknown, fallbackCode: string): never {
  if (error instanceof AppError) throw error;
  const e = error as { statusCode?: number; message?: string };
  if (e?.statusCode === 404) throw new NotFoundError('Document');
  if (e?.statusCode === 400) throw new ValidationError(e.message ?? 'Invalid request');
  if (e?.statusCode === 422) throw new ValidationError(e.message ?? 'Compliance validation failed');
  if (e?.statusCode === 503) throw new AppError(e.message ?? 'Email service unavailable', 503, 'EMAIL_SERVICE_NOT_CONFIGURED');
  const message = e?.message ?? (error instanceof Error ? error.message : 'Unknown error');
  if (
    message.includes('SendGrid') ||
    message.toLowerCase().includes('unauthorized') ||
    message.toLowerCase().includes('from_email')
  ) {
    throw new AppError(message, 503, 'EMAIL_PROVIDER_ERROR');
  }
  getLogger().error('Document route error', error instanceof Error ? error : undefined);
  throw new AppError(message, 500, fallbackCode);
}

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
      offset
    });
  } catch (error) {
    getLogger().error('Error getting printing history', error instanceof Error ? error : undefined);
    throw new AppError('Failed to get printing history', 500, 'PRINTING_HISTORY_FETCH_FAILED');
  }
}));

// Export router
export default router;
