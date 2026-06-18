import type { Pool } from 'pg';

import { BasePrintingService } from './BasePrintingService';
import {
  ClosureBulletinData,
  PrintResult,
  Printer,
  PrinterStatus,
  PrintingConfig,
  ReceiptData,
} from './types';
import {
  createBridgePrintJob,
  getBridgeQueueStatus,
  type BridgePrintDocumentType,
} from '../../printing/bridgePrintJobRepo';

/**
 * Cloud-side service for MuseBar Print Bridge.
 * It never contacts LAN printers. It renders ESC/POS and stores durable jobs
 * for a local bridge process to poll and print from inside the establishment.
 */
export class BridgePrintService extends BasePrintingService {
  private readonly pool: Pool;
  private readonly establishmentId: string;
  private readonly printerLabel: string;

  constructor(config: PrintingConfig, pool: Pool) {
    super(config);
    if (!config.establishmentId) {
      throw new Error('establishmentId is required for bridge printing');
    }
    this.pool = pool;
    this.establishmentId = config.establishmentId;
    this.printerLabel = config.printerLabel?.trim() || 'MuseBar Bridge';
  }

  async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  async printReceipt(data: ReceiptData): Promise<PrintResult> {
    const documentType =
      data.order_id === 99999 && data.sequence_number === 99999 ? 'test' : 'receipt';
    return this.enqueueReceipt(data, documentType);
  }

  async testPrint(): Promise<PrintResult> {
    const testData: ReceiptData = {
      order_id: 99999,
      sequence_number: 99999,
      total_amount: 10.00,
      total_tax: 2.00,
      payment_method: 'Test',
      created_at: new Date().toISOString(),
      business_info: {
        name: 'TEST PRINT',
        address: 'Test Address',
        phone: '00 00 00 00 00',
        email: 'test@example.com',
      },
      receipt_type: 'summary',
      items: [{
        product_name: 'Test Item',
        quantity: 1,
        unit_price: 8.00,
        total_price: 8.00,
        tax_rate: 20,
      }],
      compliance_info: {
        receipt_hash: 'TEST-HASH',
        cash_register_id: 'TEST-CR',
        operator_id: 'TEST-OP',
      },
    };

    const result = await this.enqueueReceipt(testData, 'test');
    return {
      ...result,
      message: result.success
        ? 'Test print queued for MuseBar Bridge'
        : `Test print failed: ${result.message}`,
    };
  }

  async printClosureBulletin(_data: ClosureBulletinData): Promise<PrintResult> {
    return {
      success: false,
      message: 'Closure bulletin printing is not enabled for MuseBar Bridge V1',
      provider: 'bridge',
    };
  }

  async checkPrinterStatus(_printerId?: string): Promise<PrinterStatus> {
    void _printerId;
    const status = await getBridgeQueueStatus(this.pool, this.establishmentId);
    return {
      available: true,
      status: `Bridge queue: ${status.pending} pending, ${status.claimed} claimed`,
      printerId: 'bridge-default',
      printerName: this.printerLabel,
      provider: 'bridge',
    };
  }

  async listPrinters(): Promise<Printer[]> {
    const status = await getBridgeQueueStatus(this.pool, this.establishmentId);
    return [{
      id: 'bridge-default',
      name: this.printerLabel,
      description: `Local bridge queue (${status.pending} pending)`,
      capabilities: ['thermal', 'receipt', 'bridge', 'network-escpos'],
      isDefault: true,
      status: status.lastError ? `Last error: ${status.lastError}` : 'Configured',
      provider: 'bridge',
    }];
  }

  private async enqueueReceipt(
    data: ReceiptData,
    documentType: Extract<BridgePrintDocumentType, 'test' | 'receipt'>
  ): Promise<PrintResult> {
    try {
      const payload = this.generateReceiptContent(data);
      const job = await createBridgePrintJob(this.pool, {
        establishmentId: this.establishmentId,
        documentType,
        payloadFormat: 'escpos',
        payloadBase64: Buffer.from(payload, 'latin1').toString('base64'),
        metadata: {
          order_id: data.order_id,
          sequence_number: data.sequence_number,
          document_kind: data.document_kind ?? 'ticket',
        },
      });

      return {
        success: true,
        message: 'Print job queued for MuseBar Bridge',
        printJobId: job.id,
        provider: 'bridge',
        metadata: {
          document_type: documentType,
          queue_status: job.status,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Bridge queue failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: 'bridge',
      };
    }
  }
}
