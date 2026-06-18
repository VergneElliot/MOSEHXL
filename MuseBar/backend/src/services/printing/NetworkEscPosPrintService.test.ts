import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NetworkEscPosPrintService } from './NetworkEscPosPrintService';

const mocks = vi.hoisted(() => ({
  sendEscPosToPrinter: vi.fn(),
}));

vi.mock('./networkEscPosSocket', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./networkEscPosSocket')>();
  return {
    ...actual,
    sendEscPosToPrinter: mocks.sendEscPosToPrinter,
  };
});

describe('NetworkEscPosPrintService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendEscPosToPrinter.mockResolvedValue(undefined);
  });

  const service = new NetworkEscPosPrintService({
    provider: 'network-escpos',
    establishmentId: 'est-1',
    printerHost: '192.168.0.95',
    printerPort: 9100,
  });

  it('sends ESC/POS to configured host on printReceipt', async () => {
    const result = await service.printReceipt({
      order_id: 1,
      sequence_number: 42,
      total_amount: 12,
      total_tax: 2,
      payment_method: 'card',
      created_at: new Date().toISOString(),
      business_info: {
        name: 'Muse',
        address: 'Addr',
        phone: '01',
        email: 'muse@test.fr',
      },
      receipt_type: 'summary',
    });

    expect(result.success).toBe(true);
    expect(mocks.sendEscPosToPrinter).toHaveBeenCalledTimes(1);
    expect(mocks.sendEscPosToPrinter.mock.calls[0][1]).toEqual({
      host: '192.168.0.95',
      port: 9100,
    });
  });

  it('uses ASCII-safe text for thermal receipt payloads', async () => {
    await service.printReceipt({
      order_id: 2,
      sequence_number: 43,
      total_amount: 12,
      total_tax: 2,
      payment_method: 'cash',
      created_at: new Date().toISOString(),
      business_info: {
        name: 'Musé Bar',
        address: 'Rue de l’Été',
        phone: '01',
        email: 'muse@test.fr',
      },
      receipt_type: 'detailed',
      items: [{
        product_name: 'Café crème',
        quantity: 1,
        unit_price: 12,
        total_price: 12,
        tax_rate: 20,
      }],
    });

    const payload = mocks.sendEscPosToPrinter.mock.calls[0][0] as string;
    expect(payload).toContain('Muse Bar');
    expect(payload).toContain('Cafe creme');
    expect(payload).toContain('12.00 EUR');
    expect(payload).toContain('Especes');
    expect(payload).not.toContain('€');
    expect(payload).not.toContain('é');
    expect(payload).not.toContain('É');
  });

  it('preserves ESC/POS cut command after thermal text normalization', async () => {
    await service.printReceipt({
      order_id: 3,
      sequence_number: 44,
      total_amount: 12,
      total_tax: 2,
      payment_method: 'card',
      created_at: new Date().toISOString(),
      business_info: {
        name: 'Muse',
        address: 'Addr',
        phone: '01',
        email: 'muse@test.fr',
      },
      receipt_type: 'summary',
    });

    const payload = mocks.sendEscPosToPrinter.mock.calls[0][0] as string;
    expect(payload).toContain('\x1D\x56\x00');
    expect(payload).not.toContain('\x1D\x56?');
    expect(payload.indexOf('\x1D\x56\x00')).toBeGreaterThan(payload.indexOf('Merci de votre visite!'));
  });

  it('prints invoice detail mode according to receipt_type', async () => {
    await service.printReceipt({
      order_id: 4,
      sequence_number: 45,
      document_kind: 'invoice',
      document_number: 'FAC-2026-000045',
      total_amount: 18,
      total_tax: 3,
      payment_method: 'card',
      created_at: new Date().toISOString(),
      business_info: {
        name: 'Muse',
        address: 'Addr',
        phone: '01',
        email: 'muse@test.fr',
      },
      receipt_type: 'detailed',
      items: [{
        product_name: 'Cafe',
        quantity: 2,
        unit_price: 9,
        total_price: 18,
        tax_rate: 20,
      }],
    });

    const payload = mocks.sendEscPosToPrinter.mock.calls[0][0] as string;
    expect(payload).toContain('FACTURE #FAC-2026-000045');
    expect(payload).toContain('Facture detaillee');
    expect(payload).toContain('ARTICLES');
    expect(payload).toContain('Cafe');
  });
});
