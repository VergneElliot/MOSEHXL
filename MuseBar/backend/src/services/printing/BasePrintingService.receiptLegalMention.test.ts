import { describe, expect, it } from 'vitest';
import { BasePrintingService } from './BasePrintingService';
import type { PrintingConfig, Printer, PrinterStatus, PrintResult, ReceiptData, ClosureBulletinData } from './types';

class TestPrintingService extends BasePrintingService {
  async initialize(): Promise<void> {
    return;
  }

  async printReceipt(_data: ReceiptData): Promise<PrintResult> {
    return { success: true, message: 'ok' };
  }

  async printClosureBulletin(_data: ClosureBulletinData): Promise<PrintResult> {
    return { success: true, message: 'ok' };
  }

  async checkPrinterStatus(_printerId?: string): Promise<PrinterStatus> {
    return { available: true, status: 'ok' };
  }

  async listPrinters(): Promise<Printer[]> {
    return [];
  }

  public renderReceipt(data: ReceiptData): string {
    return this.generateReceiptContent(data);
  }
}

describe('BasePrintingService thermal receipt legal mention', () => {
  it('includes Article 286-I-3 bis legal reference in receipt body', () => {
    const service = new TestPrintingService({
      provider: 'digital',
    } as PrintingConfig);

    const receipt = service.renderReceipt({
      order_id: 1,
      sequence_number: 1001,
      total_amount: 12,
      total_tax: 2,
      payment_method: 'card',
      created_at: new Date('2026-04-30T12:00:00.000Z').toISOString(),
      receipt_type: 'summary',
      business_info: {
        name: 'Cafe Blue',
        address: '1 Rue Exemple',
        phone: '0102030405',
        email: 'contact@cafeblue.fr',
      },
      compliance_info: {
        receipt_hash: 'abcdef',
        cash_register_id: 'REG-1',
        operator_id: 'OP-1',
      },
    });

    expect(receipt).toContain('Ref. legale: Article 286-I-3 bis du CGI');
  });
});
