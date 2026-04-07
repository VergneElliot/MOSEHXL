import { BasePrintingService } from '../printing/BasePrintingService';
import { 
  IPrintingService,
  ReceiptData, 
  ClosureBulletinData, 
  PrintResult, 
  PrinterStatus, 
  Printer,
  PrintingConfig 
} from '../printing/types';
import { EmailReceiptService } from './EmailReceiptService';
import { QRReceiptService } from './QRReceiptService';

interface DigitalReceiptConfig extends PrintingConfig {
  emailEnabled?: boolean;
  qrEnabled?: boolean;
  defaultEmail?: string;
}

export class DigitalReceiptService extends BasePrintingService implements IPrintingService {
  private emailService: EmailReceiptService;
  private qrService: QRReceiptService;
  private digitalConfig: DigitalReceiptConfig;

  constructor(config: DigitalReceiptConfig) {
    super(config);
    this.digitalConfig = {
      emailEnabled: true,
      qrEnabled: true,
      ...config
    };
    
    this.emailService = new EmailReceiptService();
    this.qrService = new QRReceiptService();
  }

  async initialize(): Promise<void> {
    this.isInitialized = true;
    console.log('Digital receipt service initialized');
  }

  async printReceipt(data: ReceiptData): Promise<PrintResult> {
    try {
      const results: any = {
        qrCode: null,
        emailSent: false,
        receiptUrl: null
      };

      // Generate QR code
      if (this.digitalConfig.qrEnabled) {
        results.qrCode = await this.qrService.generateReceiptQRCode(data.order_id);
        results.receiptUrl = `${process.env.APP_URL || 'http://localhost:3000'}/receipts/${data.order_id}`;
      }

      // Send email if configured
      if (this.digitalConfig.emailEnabled && this.digitalConfig.defaultEmail) {
        try {
          await this.emailService.sendReceipt(data, this.digitalConfig.defaultEmail);
          results.emailSent = true;
        } catch (emailError) {
          console.error('Failed to send email receipt:', emailError);
        }
      }

      return {
        success: true,
        message: 'Digital receipt generated successfully',
        provider: 'digital',
        metadata: results
      };
    } catch (error) {
      return {
        success: false,
        message: `Digital receipt failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: 'digital'
      };
    }
  }

  async printClosureBulletin(data: ClosureBulletinData): Promise<PrintResult> {
    try {
      const results: any = {
        qrCode: null,
        emailSent: false,
        bulletinUrl: null
      };

      // Generate QR code
      if (this.digitalConfig.qrEnabled) {
        results.qrCode = await this.qrService.generateClosureBulletinQRCode(data.id);
        results.bulletinUrl = `${process.env.APP_URL || 'http://localhost:3000'}/closure-bulletins/${data.id}`;
      }

      // Send email if configured
      if (this.digitalConfig.emailEnabled && this.digitalConfig.defaultEmail) {
        try {
          await this.emailService.sendClosureBulletin(data, this.digitalConfig.defaultEmail);
          results.emailSent = true;
        } catch (emailError) {
          console.error('Failed to send email bulletin:', emailError);
        }
      }

      return {
        success: true,
        message: 'Digital closure bulletin generated successfully',
        provider: 'digital',
        metadata: results
      };
    } catch (error) {
      return {
        success: false,
        message: `Digital bulletin failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: 'digital'
      };
    }
  }

  async checkPrinterStatus(printerId?: string): Promise<PrinterStatus> {
    void printerId;
    // Check if email service is configured
    const emailConfigured = !!(this.digitalConfig.emailEnabled && this.digitalConfig.defaultEmail);
    
    return {
      available: true,
      status: emailConfigured ? 'Email and QR code services available' : 'QR code service available',
      printerId: 'digital',
      printerName: 'Digital Receipt Service',
      provider: 'digital'
    };
  }

  async listPrinters(): Promise<Printer[]> {
    return [{
      id: 'digital',
      name: 'Digital Receipt Service',
      description: 'Email and QR code receipts',
      capabilities: ['email', 'qr', 'digital', 'receipt', 'bulletin'],
      isDefault: true,
      status: 'Available',
      provider: 'digital'
    }];
  }

  /**
   * Send receipt to specific email address
   */
  async sendReceiptToEmail(data: ReceiptData, email: string): Promise<PrintResult> {
    try {
      await this.emailService.sendReceipt(data, email);
      
      return {
        success: true,
        message: `Receipt sent to ${email}`,
        provider: 'digital'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: 'digital'
      };
    }
  }

  /**
   * Generate standalone QR code for receipt
   */
  async generateReceiptQR(receiptId: number | string): Promise<string> {
    return await this.qrService.generateReceiptQRCode(receiptId);
  }

  /**
   * Configure email settings
   */
  setEmailConfig(email: string): void {
    this.digitalConfig.defaultEmail = email;
    this.digitalConfig.emailEnabled = true;
  }
}
