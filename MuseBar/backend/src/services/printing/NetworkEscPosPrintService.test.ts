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
});
