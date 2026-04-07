import axios, { AxiosInstance } from 'axios';
import { BasePrintingService } from './BasePrintingService';
import { 
  ReceiptData, 
  ClosureBulletinData, 
  PrintResult, 
  PrinterStatus, 
  Printer,
  PrintingConfig 
} from './types';

interface PrintNodePrinter {
  id: number;
  computer: {
    id: number;
    name: string;
  };
  name: string;
  description: string;
  capabilities: {
    bins: string[];
    papers: any[];
  };
  default: boolean;
  state: string;
}

interface PrintNodePrintJob {
  printerId: number;
  title: string;
  contentType: 'raw_base64' | 'pdf_base64' | 'raw_uri' | 'pdf_uri';
  content: string;
  source: string;
  options?: {
    copies?: number;
    paper?: string;
    bin?: string;
  };
}

export class PrintNodeService extends BasePrintingService {
  private client: AxiosInstance;
  private apiKey: string;
  private defaultPrinterId?: number;

  constructor(config: PrintingConfig) {
    super(config);
    this.apiKey = config.apiKey || process.env.PRINTNODE_API_KEY || '';
    
    this.client = axios.create({
      baseURL: 'https://api.printnode.com',
      auth: {
        username: this.apiKey,
        password: ''
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('PrintNode API key is required');
    }

    try {
      // Test API connection
      const response = await this.client.get('/whoami');
      process.stdout.write(`PrintNode initialized for account: ${response.data.email}\n`);
      
      // Get default printer if configured
      if (this.config.defaultPrinter) {
        const printers = await this.listPrinters();
        const defaultPrinter = printers.find(p => p.name === this.config.defaultPrinter);
        if (defaultPrinter) {
          this.defaultPrinterId = parseInt(defaultPrinter.id);
        }
      }
      
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize PrintNode: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async printReceipt(data: ReceiptData): Promise<PrintResult> {
    try {
      const content = this.generateReceiptContent(data);
      const base64Content = Buffer.from(content, 'utf8').toString('base64');
      
      const printJob: PrintNodePrintJob = {
        printerId: await this.getDefaultPrinterId(),
        title: `Receipt #${data.sequence_number}`,
        contentType: 'raw_base64',
        content: base64Content,
        source: 'MuseBar POS',
        options: {
          copies: 1,
          paper: 'receipt'
        }
      };

      const response = await this.client.post('/printjobs', printJob);
      
      return {
        success: true,
        message: 'Receipt sent to PrintNode successfully',
        printJobId: response.data.id,
        provider: 'printnode',
        metadata: {
          printerId: printJob.printerId,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `PrintNode printing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: 'printnode'
      };
    }
  }

  async printClosureBulletin(data: ClosureBulletinData): Promise<PrintResult> {
    try {
      const content = this.generateClosureBulletinContent(data);
      const base64Content = Buffer.from(content, 'utf8').toString('base64');
      
      const printJob: PrintNodePrintJob = {
        printerId: await this.getDefaultPrinterId(),
        title: `Closure Bulletin #${data.id}`,
        contentType: 'raw_base64',
        content: base64Content,
        source: 'MuseBar POS',
        options: {
          copies: 1,
          paper: 'receipt'
        }
      };

      const response = await this.client.post('/printjobs', printJob);
      
      return {
        success: true,
        message: 'Closure bulletin sent to PrintNode successfully',
        printJobId: response.data.id,
        provider: 'printnode',
        metadata: {
          printerId: printJob.printerId,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `PrintNode printing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: 'printnode'
      };
    }
  }

  async checkPrinterStatus(printerId?: string): Promise<PrinterStatus> {
    try {
      const id = printerId ? parseInt(printerId) : await this.getDefaultPrinterId();
      const response = await this.client.get(`/printers/${id}`);
      const printer: PrintNodePrinter = response.data;
      
      return {
        available: printer.state === 'online',
        status: printer.state,
        printerId: printer.id.toString(),
        printerName: printer.name,
        provider: 'printnode'
      };
    } catch (error) {
      return {
        available: false,
        status: `Error checking printer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: 'printnode'
      };
    }
  }

  async listPrinters(): Promise<Printer[]> {
    try {
      const response = await this.client.get('/printers');
      const printnodePrinters: PrintNodePrinter[] = response.data;
      
      return printnodePrinters.map(printer => ({
        id: printer.id.toString(),
        name: printer.name,
        description: `${printer.description} (${printer.computer.name})`,
        capabilities: ['thermal', 'receipt', 'pdf'],
        isDefault: printer.default || printer.id === this.defaultPrinterId,
        status: printer.state,
        provider: 'printnode'
      }));
    } catch (error) {
      process.stderr.write(`Error listing PrintNode printers: ${error instanceof Error ? error.message : String(error)}\n`);
      return [];
    }
  }

  private async getDefaultPrinterId(): Promise<number> {
    if (this.defaultPrinterId) {
      return this.defaultPrinterId;
    }

    // Get the first available printer
    const printers = await this.listPrinters();
    if (printers.length === 0) {
      throw new Error('No printers available in PrintNode');
    }

    // Prefer thermal/receipt printers
    const receiptPrinter = printers.find(p => 
      p.name.toLowerCase().includes('receipt') || 
      p.name.toLowerCase().includes('thermal') ||
      p.description?.toLowerCase().includes('receipt') ||
      p.description?.toLowerCase().includes('thermal')
    );

    if (receiptPrinter) {
      this.defaultPrinterId = parseInt(receiptPrinter.id);
      return this.defaultPrinterId;
    }

    // Otherwise use the first printer
    this.defaultPrinterId = parseInt(printers[0].id);
    return this.defaultPrinterId;
  }
}
