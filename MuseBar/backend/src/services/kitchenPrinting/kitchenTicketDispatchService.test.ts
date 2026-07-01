import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createBridgePrintJob: vi.fn(),
  logSoftwareEventBestEffort: vi.fn(),
}));

vi.mock('../../printing/bridgePrintJobRepo', () => ({
  createBridgePrintJob: mocks.createBridgePrintJob,
}));

vi.mock('../legal/softwareEventJournal', () => ({
  logSoftwareEventBestEffort: mocks.logSoftwareEventBestEffort,
}));

import { dispatchKitchenTicketsForCompletedOrder } from './kitchenTicketDispatchService';

describe('kitchenTicketDispatchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createBridgePrintJob.mockImplementation(async (_pool, input) => ({
      id: `job-${input.metadata.kitchen_printer_slug}`,
      document_type: input.documentType,
      metadata: input.metadata,
    }));
    mocks.logSoftwareEventBestEffort.mockResolvedValue(undefined);
  });

  it('enqueues one job per printer with kitchen metadata', async () => {
    const result = await dispatchKitchenTicketsForCompletedOrder({} as never, {
      establishmentId: 'est-1',
      order: { id: 7, created_at: new Date('2026-07-01T12:00:00Z') },
      items: [
        {
          product_name: 'Mojito',
          quantity: 1,
          kitchen_printer_ids_snapshot: [{ id: 1, name: 'Bar', slug: 'bar' }],
        },
        {
          product_name: 'Entrecote',
          quantity: 1,
          kitchen_printer_ids_snapshot: [{ id: 2, name: 'Cuisine', slug: 'cuisine' }],
        },
      ],
    });

    expect(result.enqueued).toBe(2);
    expect(result.failures).toBe(0);
    expect(mocks.createBridgePrintJob).toHaveBeenCalledTimes(2);
    expect(mocks.createBridgePrintJob.mock.calls[0]?.[1]?.documentType).toBe('kitchen_order');
    expect(mocks.createBridgePrintJob.mock.calls[0]?.[1]?.metadata).toMatchObject({
      kitchen_printer_slug: 'bar',
      order_id: 7,
      ticket_kind: 'order',
    });
  });

  it('skips items without printer assignments', async () => {
    const result = await dispatchKitchenTicketsForCompletedOrder({} as never, {
      establishmentId: 'est-1',
      order: { id: 8, created_at: new Date() },
      items: [{ product_name: 'Chips', quantity: 1, kitchen_printer_ids_snapshot: [] }],
    });

    expect(result.enqueued).toBe(0);
    expect(mocks.createBridgePrintJob).not.toHaveBeenCalled();
  });

  it('logs failures without throwing', async () => {
    mocks.createBridgePrintJob.mockRejectedValueOnce(new Error('queue down'));
    const logger = { error: vi.fn() };

    const result = await dispatchKitchenTicketsForCompletedOrder({} as never, {
      establishmentId: 'est-1',
      order: { id: 9, created_at: new Date() },
      items: [
        {
          product_name: 'Mojito',
          quantity: 1,
          kitchen_printer_ids_snapshot: [{ id: 1, name: 'Bar', slug: 'bar' }],
        },
      ],
      logger,
    });

    expect(result.enqueued).toBe(0);
    expect(result.failures).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(mocks.logSoftwareEventBestEffort).toHaveBeenCalled();
  });
});
