import * as net from 'net';
import { BasePrintingService } from './BasePrintingService';
import { 
  ReceiptData, 
  ClosureBulletinData, 
  PrintResult, 
  PrinterStatus, 
  Printer,
  PrintingConfig 
} from './types';

export class NetworkPrintingService extends BasePrintingService {
  private printerIp: string;
  private printerPort: number;
  private timeout: number;

  constructor(config: PrintingConfig) {
    super(config);
    this.printerIp = config.networkPrinterIp || process.env.NETWORK_PRINTER_IP || '192.168.0.241';
    this.printerPort = config.networkPrinterPort || parseInt(process.env.NETWORK_PRINTER_PORT || '9100');
    this.timeout = config.timeout || 10000;
  }

  async initialize(): Promise<void> {
    // Test connection to printer
    const status = await this.checkPrinterStatus();
    if (!status.available) {
      process.stderr.write(`Network printer at ${this.printerIp}:${this.printerPort} is not available: ${status.status}\n`);
    } else {
      process.stdout.write(`Network printer initialized at ${this.printerIp}:${this.printerPort}\n`);
    }
    this.isInitialized = true;
  }

  async printReceipt(data: ReceiptData): Promise<PrintResult> {
    try {
      const content = this.generateReceiptContent(data);
      return await this.sendToNetworkPrinter(content, 'receipt');
    } catch (error) {
      return {
        success: false,
        message: `Network printing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: 'network'
      };
    }
  }

  async printClosureBulletin(data: ClosureBulletinData): Promise<PrintResult> {
    try {
      const content = this.generateClosureBulletinContent(data);
      return await this.sendToNetworkPrinter(content, 'closure_bulletin');
    } catch (error) {
      return {
        success: false,
        message: `Network printing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: 'network'
      };
    }
  }

  async checkPrinterStatus(printerId?: string): Promise<PrinterStatus> {
    void printerId;
    return new Promise((resolve) => {
      const client = new net.Socket();
      const timeoutHandle = setTimeout(() => {
        client.destroy();
        resolve({
          available: false,
          status: 'Connection timeout',
          printerId: this.printerIp,
          printerName: `Network Printer (${this.printerIp})`,
          provider: 'network'
        });
      }, 5000);

      client.connect(this.printerPort, this.printerIp, () => {
        clearTimeout(timeoutHandle);
        client.destroy();
        resolve({
          available: true,
          status: 'Printer is available',
          printerId: this.printerIp,
          printerName: `Network Printer (${this.printerIp})`,
          provider: 'network'
        });
      });

      client.on('error', (error: Error) => {
        clearTimeout(timeoutHandle);
        resolve({
          available: false,
          status: `Connection error: ${error.message}`,
          printerId: this.printerIp,
          printerName: `Network Printer (${this.printerIp})`,
          provider: 'network'
        });
      });
    });
  }

  async listPrinters(): Promise<Printer[]> {
    const status = await this.checkPrinterStatus();
    return [{
      id: this.printerIp,
      name: `Network Printer (${this.printerIp})`,
      description: `ESC/POS printer at ${this.printerIp}:${this.printerPort}`,
      capabilities: ['thermal', 'receipt', 'escpos'],
      isDefault: true,
      status: status.status,
      provider: 'network'
    }];
  }

  private sendToNetworkPrinter(content: string, type: string): Promise<PrintResult> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      let resolved = false;
      
      // Set timeout
      const timeoutHandle = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          client.destroy();
          resolve({
            success: false,
            message: 'Network printer connection timeout',
            provider: 'network'
          });
        }
      }, this.timeout);

      client.connect(this.printerPort, this.printerIp, () => {
        process.stdout.write(`✅ Connected to network printer at ${this.printerIp}:${this.printerPort}\n`);
        
        // Send the print content
        client.write(content, 'binary', (error) => {
          if (error && !resolved) {
            resolved = true;
            clearTimeout(timeoutHandle);
            client.destroy();
            resolve({
              success: false,
              message: `Write error: ${error.message}`,
              provider: 'network'
            });
          } else {
            process.stdout.write(`📄 ${type} content sent to network printer\n`);
            // Give printer time to process before closing
            setTimeout(() => {
              client.end();
            }, 100);
          }
        });
      });

      client.on('close', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandle);
          process.stdout.write('🔌 Network printer connection closed\n');
          resolve({
            success: true,
            message: `${type} sent to network printer successfully`,
            provider: 'network',
            metadata: {
              printerIp: this.printerIp,
              printerPort: this.printerPort,
              timestamp: new Date().toISOString()
            }
          });
        }
      });

      client.on('error', (error: Error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandle);
          process.stderr.write(`❌ Network printer error: ${error.message}\n`);
          resolve({
            success: false,
            message: `Network printer error: ${error.message}`,
            provider: 'network'
          });
        }
      });
    });
  }
}
