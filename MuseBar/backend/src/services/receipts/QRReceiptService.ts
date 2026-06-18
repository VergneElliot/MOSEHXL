import * as QRCode from 'qrcode';
import { ReceiptData } from '../printing/types';
import { Logger } from '../../utils/logger';

function logParseWarning(message: string, details: { error: unknown; qrDataPreview: string }): void {
  try {
    Logger.getInstance().warn(
      message,
      { error: details.error as Error, qrDataPreview: details.qrDataPreview },
      'QR_RECEIPT'
    );
  } catch {
    const errMsg = details.error instanceof Error ? details.error.message : String(details.error);
    process.stderr.write(`[QR_RECEIPT] ${message}: ${errMsg}\n`);
  }
}

export class QRReceiptService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.APP_URL || 'http://localhost:3000';
  }

  /**
   * Generate QR code for receipt viewing
   */
  async generateReceiptQRCode(receiptId: number | string): Promise<string> {
    const url = `${this.baseUrl}/receipts/${receiptId}`;
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  }

  /**
   * Generate QR code for closure bulletin viewing
   */
  async generateClosureBulletinQRCode(bulletinId: number | string): Promise<string> {
    const url = `${this.baseUrl}/closure-bulletins/${bulletinId}`;
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  }

  /**
   * Generate QR code with receipt data embedded (offline viewing)
   */
  async generateOfflineReceiptQRCode(data: ReceiptData): Promise<string> {
    // Create a compact version of receipt data
    const compactData = {
      id: data.sequence_number,
      o: data.order_id,
      t: data.total_amount,
      d: new Date(data.created_at).toISOString().split('T')[0],
      m: data.payment_method,
      h: data.compliance_info?.receipt_hash?.substring(0, 8)
    };

    const jsonString = JSON.stringify(compactData);
    
    // Check if data is too large for QR code
    if (jsonString.length > 2000) {
      // Fall back to URL-based QR code
      return this.generateReceiptQRCode(data.order_id);
    }

    return await QRCode.toDataURL(jsonString, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'L' // Low error correction for more data capacity
    });
  }

  /**
   * Generate QR code as buffer for email attachments
   */
  async generateQRCodeBuffer(data: string): Promise<Buffer> {
    return await QRCode.toBuffer(data, {
      width: 300,
      margin: 2
    });
  }

  /**
   * Generate QR code as SVG
   */
  async generateQRCodeSVG(data: string): Promise<string> {
    return await QRCode.toString(data, {
      type: 'svg',
      width: 300,
      margin: 2
    });
  }

  /**
   * Generate payment QR code (for future payment integration)
   */
  async generatePaymentQRCode(
    amount: number,
    orderId: number,
    establishmentId: number
  ): Promise<string> {
    // This could integrate with payment providers like Stripe, PayPal, etc.
    const paymentData = {
      type: 'payment',
      amount,
      currency: 'EUR',
      orderId,
      establishmentId,
      timestamp: Date.now()
    };

    return await QRCode.toDataURL(JSON.stringify(paymentData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#1976D2', // Blue for payment QR codes
        light: '#FFFFFF'
      }
    });
  }

  /**
   * Verify QR code data (for scanning functionality)
   */
  parseQRCodeData(qrData: string): unknown {
    try {
      // Try to parse as JSON first
      return JSON.parse(qrData);
    } catch (error) {
      logParseWarning('Failed to parse QR data as JSON; falling back to URL parsing', {
        error,
        qrDataPreview: qrData.slice(0, 120),
      });
      // If not JSON, assume it's a URL
      const urlMatch = qrData.match(/\/receipts\/(\d+)$/);
      const receiptId = urlMatch?.[1];
      if (receiptId) {
        return {
          type: 'receipt_url',
          receiptId: parseInt(receiptId, 10)
        };
      }

      const bulletinMatch = qrData.match(/\/closure-bulletins\/(\d+)$/);
      const bulletinId = bulletinMatch?.[1];
      if (bulletinId) {
        return {
          type: 'bulletin_url',
          bulletinId: parseInt(bulletinId, 10)
        };
      }

      // Unknown format
      return {
        type: 'unknown',
        data: qrData
      };
    }
  }
}
