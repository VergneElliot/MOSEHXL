import { BasePrintingService } from './BasePrintingService';
import {
  ReceiptData,
  ClosureBulletinData,
  PrintResult,
  PrinterStatus,
  Printer,
  PrintingConfig,
} from './types';
import { enqueueEposJob, queueLength } from './epsonJobStore';
import { closureBulletinToEposPrintXml, receiptToEposPrintXml } from './eposPrintXml';

/**
 * Queues ePOS-Print XML jobs for TM-Intelligent printers using Epson Server Direct Print
 * (printer polls GET /api/printing/epson/poll with establishment_id + key).
 */
export class EpsonServerDirectPrintService extends BasePrintingService {
  private establishmentId: number;
  private printerLabel: string;

  constructor(config: PrintingConfig) {
    super(config);
    if (!config.establishmentId || config.establishmentId <= 0) {
      throw new Error('Epson Server Direct Print requires establishmentId');
    }
    this.establishmentId = config.establishmentId;
    this.printerLabel = config.printerLabel?.trim() || 'Epson (Server Direct)';
  }

  async initialize(): Promise<void> {
    this.isInitialized = true;
    process.stdout.write(
      `Epson Server Direct Print initialized for establishment ${this.establishmentId}\n`
    );
  }

  async printReceipt(data: ReceiptData): Promise<PrintResult> {
    try {
      const xml = receiptToEposPrintXml(data);
      const printJobId = enqueueEposJob(this.establishmentId, xml);
      return {
        success: true,
        message: 'Receipt queued for Epson Server Direct Print',
        printJobId,
        provider: 'epson-server-direct',
        metadata: { queued: queueLength(this.establishmentId) },
      };
    } catch (error) {
      return {
        success: false,
        message: `Epson printing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: 'epson-server-direct',
      };
    }
  }

  async printClosureBulletin(data: ClosureBulletinData): Promise<PrintResult> {
    try {
      const xml = closureBulletinToEposPrintXml(data);
      const printJobId = enqueueEposJob(this.establishmentId, xml);
      return {
        success: true,
        message: 'Closure bulletin queued for Epson Server Direct Print',
        printJobId,
        provider: 'epson-server-direct',
        metadata: { queued: queueLength(this.establishmentId) },
      };
    } catch (error) {
      return {
        success: false,
        message: `Epson printing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: 'epson-server-direct',
      };
    }
  }

  async checkPrinterStatus(_printerId?: string): Promise<PrinterStatus> {
    void _printerId;
    const pending = queueLength(this.establishmentId);
    return {
      available: true,
      status:
        pending > 0
          ? `${pending} job(s) waiting for printer poll`
          : 'Ready — configure TM-Intelligent Server Direct Print to poll this server',
      printerId: `epson-sdp-${this.establishmentId}`,
      printerName: this.printerLabel,
      provider: 'epson-server-direct',
    };
  }

  async listPrinters(): Promise<Printer[]> {
    return [
      {
        id: `epson-sdp-${this.establishmentId}`,
        name: this.printerLabel,
        description: 'Epson TM-Intelligent — Server Direct Print (cloud poll)',
        capabilities: ['thermal', 'receipt', 'epson-server-direct', 'epos-print-xml'],
        isDefault: true,
        status: 'configure printer web UI with poll URL',
        provider: 'epson-server-direct',
      },
    ];
  }
}
