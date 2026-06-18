import { BasePrintingService } from './BasePrintingService';
import {
  ClosureBulletinData,
  ReceiptData,
  PrintResult,
  PrinterStatus,
  Printer,
  PrintingConfig,
} from './types';
import { resolveNetworkPrinterEndpoint, sendEscPosToPrinter } from './networkEscPosSocket';

/**
 * Sends ESC/POS directly to a LAN receipt printer (Epson TM-m30II and similar).
 * Requires the API process to be on the same network as the printer.
 */
export class NetworkEscPosPrintService extends BasePrintingService {
  private printerLabel: string;
  private endpoint: { host: string; port: number };

  constructor(config: PrintingConfig) {
    super(config);
    this.printerLabel = config.printerLabel?.trim() || 'Network receipt printer';
    this.endpoint = resolveNetworkPrinterEndpoint(config as unknown as Record<string, unknown>);
  }

  async initialize(): Promise<void> {
    this.isInitialized = true;
    process.stdout.write(
      `Network ESC/POS printing initialized for ${this.endpoint.host}:${this.endpoint.port}\n`
    );
  }

  async printReceipt(data: ReceiptData): Promise<PrintResult> {
    try {
      const payload = this.generateReceiptContent(data);
      await sendEscPosToPrinter(payload, this.endpoint);
      return {
        success: true,
        message: 'Receipt sent to network printer',
        provider: 'network-escpos',
        metadata: { host: this.endpoint.host, port: this.endpoint.port },
      };
    } catch (error) {
      return {
        success: false,
        message: `Network printing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: 'network-escpos',
      };
    }
  }

  async printClosureBulletin(data: ClosureBulletinData): Promise<PrintResult> {
    try {
      const payload = this.generateClosureBulletinContent(data);
      await sendEscPosToPrinter(payload, this.endpoint);
      return {
        success: true,
        message: 'Closure bulletin sent to network printer',
        provider: 'network-escpos',
        metadata: { host: this.endpoint.host, port: this.endpoint.port },
      };
    } catch (error) {
      return {
        success: false,
        message: `Network printing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: 'network-escpos',
      };
    }
  }

  async checkPrinterStatus(_printerId?: string): Promise<PrinterStatus> {
    void _printerId;
    return {
      available: true,
      status: `Configured for ${this.endpoint.host}:${this.endpoint.port} (LAN ESC/POS)`,
      printerId: 'network-default',
      printerName: this.printerLabel,
      provider: 'network-escpos',
    };
  }

  async listPrinters(): Promise<Printer[]> {
    return [
      {
        id: 'network-default',
        name: this.printerLabel,
        description: `${this.endpoint.host}:${this.endpoint.port}`,
        capabilities: ['thermal', 'receipt', 'closure', 'network-escpos'],
        isDefault: true,
        status: 'configured',
        provider: 'network-escpos',
      },
    ];
  }
}
