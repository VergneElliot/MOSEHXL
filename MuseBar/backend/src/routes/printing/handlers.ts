import { pool } from '../../db/pool';
import type { PrintResult, ReceiptData as PrintingReceiptData, ClosureBulletinData as PrintingClosureBulletinData } from '../../services/printing/types';
import {
  buildClosureBulletinData,
  buildReceiptDataForInvoice,
  buildReceiptDataForOrder,
  buildTestReceiptData,
  logPrintingHistory,
  type PrintingUser,
} from '../../printing/printDataRepo';
import { getPrintingService } from './context';

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
