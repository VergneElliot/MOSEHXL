import { describe, expect, it } from 'vitest';
import { BasePrintingService } from './BasePrintingService';
import type {
  ClosureBulletinData,
  Printer,
  PrinterStatus,
  PrintResult,
  PrintingConfig,
  ReceiptData,
} from './types';

class TestPrintingService extends BasePrintingService {
  async initialize(): Promise<void> {
    this.isInitialized = true;
  }
  async printReceipt(_data: ReceiptData): Promise<PrintResult> {
    return { success: true, message: 'ok' };
  }
  async printClosureBulletin(_data: ClosureBulletinData): Promise<PrintResult> {
    return { success: true, message: 'ok' };
  }
  async checkPrinterStatus(_printerId?: string): Promise<PrinterStatus> {
    return { available: true, status: 'ready' };
  }
  async listPrinters(): Promise<Printer[]> {
    return [];
  }

  exposeFormatPaymentMethod(method: string) {
    return this.formatPaymentMethod(method);
  }
  exposeFormatClosureType(type: string) {
    return this.formatClosureType(type);
  }
  exposePadLine(left: string, right: string, width: number) {
    return this.padLine(left, right, width);
  }
  exposeGenerateReceipt(data: ReceiptData) {
    return this.generateReceiptContent(data);
  }
  exposeGenerateClosure(data: ClosureBulletinData) {
    return this.generateClosureBulletinContent(data);
  }
}

const config: PrintingConfig = {
  provider: 'network-escpos',
  printerHost: '127.0.0.1',
  printerPort: 9100,
};

describe('BasePrintingService helpers', () => {
  const svc = new TestPrintingService(config);

  it('maps payment methods and closure types', () => {
    expect(svc.exposeFormatPaymentMethod('card')).toBe('Carte');
    expect(svc.exposeFormatPaymentMethod('cash')).toBe('Espèces');
    expect(svc.exposeFormatPaymentMethod('weird')).toBe('weird');
    expect(svc.exposeFormatClosureType('DAILY')).toBe('Journalière');
    expect(svc.exposeFormatClosureType('WEEKLY')).toBe('Hebdomadaire');
    expect(svc.exposeFormatClosureType('OTHER')).toBe('OTHER');
  });

  it('pads lines to a fixed width', () => {
    const line = svc.exposePadLine('Total', '10.00', 20);
    expect(line.length).toBe(20);
    expect(line.startsWith('Total')).toBe(true);
    expect(line.endsWith('10.00')).toBe(true);
  });

  it('generateReceiptContent includes business name and totals', () => {
    const content = svc.exposeGenerateReceipt({
      order_id: 1,
      sequence_number: 10,
      total_amount: 12.5,
      total_tax: 2.5,
      payment_method: 'card',
      created_at: '2026-01-01T12:00:00.000Z',
      business_info: {
        name: 'Café Test',
        address: '1 rue',
        phone: '0102030405',
        email: 'a@b.c',
      },
      receipt_type: 'summary',
      items: [
        {
          product_name: 'Expresso',
          quantity: 1,
          unit_price: 10,
          total_price: 10,
          tax_rate: 20,
        },
      ],
      compliance_info: {
        receipt_hash: 'HASH',
        cash_register_id: 'CR-1',
        operator_id: 'OP-1',
      },
    });
    expect(content).toContain('Cafe Test');
    expect(content).toContain('TOTAL TTC: 12.50 EUR');
    expect(content).toContain('Paiement: Carte');
  });

  it('generateClosureBulletinContent includes totals VAT and payment breakdown', () => {
    const content = svc.exposeGenerateClosure({
      id: 3,
      closure_type: 'DAILY',
      period_start: '2026-01-01T00:00:00.000Z',
      period_end: '2026-01-01T23:59:59.000Z',
      total_transactions: 4,
      fond_de_caisse: 50,
      total_amount: 110,
      total_vat: 14.17,
      vat_breakdown: {
        vat_10: { amount: 50, vat: 5, ttc: 55 },
        vat_20: { amount: 45.83, vat: 9.17 },
      },
      payment_methods_breakdown: { card: 80, cash: 30 },
      tips_total: 2,
      change_total: 1,
      first_sequence: 1,
      last_sequence: 4,
      closure_hash: 'abcdef0123456789ffffffffffffffffffffffffffffffffffffffffffffffff',
      is_closed: true,
      closed_at: '2026-01-02T02:00:00.000Z',
      created_at: '2026-01-02T02:00:00.000Z',
      business_info: {
        name: 'Café Test',
        address: '1 rue',
        phone: '0102030405',
        email: 'a@b.c',
        siret: '123',
        tax_identification: 'FR99',
      },
      compliance_info: { cash_register_id: 'CR-1' },
    });
    expect(content).toContain('BULLETIN DE CLOTURE');
    expect(content).toContain('Journaliere');
    expect(content).toContain('Carte');
    expect(content).toContain('SIRET: 123');
    expect(content).toContain('Hash: abcdef0123456789');
  });

  it('testPrint wraps printReceipt success and failure', async () => {
    await expect(svc.testPrint()).resolves.toMatchObject({
      success: true,
      message: 'Test print successful',
    });

    const failing = new (class extends TestPrintingService {
      async printReceipt(): Promise<PrintResult> {
        throw new Error('printer offline');
      }
    })(config);
    await expect(failing.testPrint()).resolves.toMatchObject({
      success: false,
      message: expect.stringContaining('printer offline'),
    });
  });
});
