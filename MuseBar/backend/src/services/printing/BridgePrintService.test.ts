import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';

const mocks = vi.hoisted(() => ({
  createBridgePrintJob: vi.fn(),
  getBridgeQueueStatus: vi.fn(),
}));

vi.mock('../../printing/bridgePrintJobRepo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../printing/bridgePrintJobRepo')>();
  return {
    ...actual,
    createBridgePrintJob: mocks.createBridgePrintJob,
    getBridgeQueueStatus: mocks.getBridgeQueueStatus,
  };
});

import { BridgePrintService } from './BridgePrintService';

describe('BridgePrintService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createBridgePrintJob.mockResolvedValue({
      id: 'job-1',
      status: 'pending',
    });
    mocks.getBridgeQueueStatus.mockResolvedValue({
      pending: 1,
      claimed: 0,
      printed: 0,
      failed: 0,
      expired: 0,
      lastPrintedAt: null,
      lastFailedAt: null,
      lastError: null,
    });
  });

  it('renders receipt ESC/POS and stores it as a bridge queue job', async () => {
    const service = new BridgePrintService(
      { provider: 'bridge', establishmentId: 'est-1', printerLabel: 'Caisse' },
      {} as Pool
    );

    const result = await service.printReceipt({
      order_id: 7,
      sequence_number: 42,
      total_amount: 12,
      total_tax: 2,
      payment_method: 'card',
      created_at: new Date('2026-06-18T10:00:00Z').toISOString(),
      business_info: {
        name: 'Muse',
        address: 'Addr',
        phone: '01',
        email: 'muse@test.fr',
      },
      receipt_type: 'summary',
    });

    expect(result.success).toBe(true);
    expect(result.printJobId).toBe('job-1');
    expect(mocks.createBridgePrintJob).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        establishmentId: 'est-1',
        documentType: 'receipt',
        payloadFormat: 'escpos',
        metadata: expect.objectContaining({ order_id: 7, sequence_number: 42 }),
      })
    );
    const payload = mocks.createBridgePrintJob.mock.calls[0][1].payloadBase64;
    expect(Buffer.from(payload, 'base64').toString('latin1')).toContain('RECU #42');
  });

  it('reports queue status through printer status', async () => {
    const service = new BridgePrintService(
      { provider: 'bridge', establishmentId: 'est-1' },
      {} as Pool
    );

    const status = await service.checkPrinterStatus();

    expect(status.provider).toBe('bridge');
    expect(status.status).toContain('1 pending');
  });
});
