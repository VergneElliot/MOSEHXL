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

  it('queues invoice payloads with invoice document type and detail mode', async () => {
    const service = new BridgePrintService(
      { provider: 'bridge', establishmentId: 'est-1', printerLabel: 'Caisse' },
      {} as Pool
    );

    const result = await service.printReceipt({
      order_id: 7,
      sequence_number: 12,
      document_kind: 'invoice',
      document_number: 'FAC-2026-000012',
      total_amount: 24,
      total_tax: 4,
      payment_method: 'card',
      created_at: new Date('2026-06-18T10:00:00Z').toISOString(),
      business_info: {
        name: 'Muse',
        address: 'Addr',
        phone: '01',
        email: 'muse@test.fr',
      },
      customer_info: {
        name: 'Client SA',
        address: '2 Rue Client',
      },
      receipt_type: 'summary',
      compliance_info: {
        invoice_hash: 'abcdef1234567890',
        source_receipt_sequence: 42,
      },
    });

    expect(result.success).toBe(true);
    expect(mocks.createBridgePrintJob).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        documentType: 'invoice',
        metadata: expect.objectContaining({
          document_kind: 'invoice',
          document_number: 'FAC-2026-000012',
          receipt_type: 'summary',
        }),
      })
    );
    const payload = mocks.createBridgePrintJob.mock.calls[0][1].payloadBase64;
    const decoded = Buffer.from(payload, 'base64').toString('latin1');
    expect(decoded).toContain('FACTURE #FAC-2026-000012');
    expect(decoded).toContain('Facture sans detail');
    expect(decoded).toContain('Client SA');
  });

  it('queues closure bulletin payloads for the bridge', async () => {
    const service = new BridgePrintService(
      { provider: 'bridge', establishmentId: 'est-1', printerLabel: 'Caisse' },
      {} as Pool
    );

    const result = await service.printClosureBulletin({
      id: 88,
      closure_type: 'DAILY',
      period_start: '2026-06-18T00:00:00.000Z',
      period_end: '2026-06-18T23:59:59.000Z',
      total_transactions: 5,
      fond_de_caisse: 100,
      total_amount: 120,
      total_vat: 20,
      vat_breakdown: {
        vat_10: { amount: 50, vat: 5, ttc: 55 },
        vat_20: { amount: 75, vat: 15, ttc: 90 },
      },
      payment_methods_breakdown: { card: 80, cash: 40 },
      first_sequence: 1,
      last_sequence: 5,
      closure_hash: 'closurehashabcdef123456',
      is_closed: true,
      closed_at: '2026-06-18T23:59:59.000Z',
      created_at: '2026-06-18T23:59:59.000Z',
      business_info: {
        name: 'Muse',
        address: 'Addr',
        phone: '01',
        email: 'muse@test.fr',
      },
    });

    expect(result.success).toBe(true);
    expect(mocks.createBridgePrintJob).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        documentType: 'closure_bulletin',
        metadata: expect.objectContaining({
          bulletin_id: 88,
          closure_type: 'DAILY',
        }),
      })
    );
    const payload = mocks.createBridgePrintJob.mock.calls[0][1].payloadBase64;
    expect(Buffer.from(payload, 'base64').toString('latin1')).toContain('BULLETIN DE CLOTURE');
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
