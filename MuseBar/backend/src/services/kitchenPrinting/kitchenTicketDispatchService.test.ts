import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createBridgePrintJob: vi.fn(),
  logSoftwareEventBestEffort: vi.fn(),
  allocateKitchenTicketDayNumber: vi.fn(),
  getKitchenTicketDayNumberForOrder: vi.fn(),
}));

vi.mock('../../printing/bridgePrintJobRepo', () => ({
  createBridgePrintJob: mocks.createBridgePrintJob,
}));

vi.mock('../legal/softwareEventJournal', () => ({
  logSoftwareEventBestEffort: mocks.logSoftwareEventBestEffort,
}));

vi.mock('./kitchenTicketDayNumberService', () => ({
  allocateKitchenTicketDayNumber: mocks.allocateKitchenTicketDayNumber,
  getKitchenTicketDayNumberForOrder: mocks.getKitchenTicketDayNumberForOrder,
}));

import { dispatchKitchenTicketsForCompletedOrder, dispatchKitchenTicketsForCancellation } from './kitchenTicketDispatchService';

describe('kitchenTicketDispatchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.allocateKitchenTicketDayNumber.mockResolvedValue(3);
    mocks.getKitchenTicketDayNumberForOrder.mockResolvedValue(3);
    mocks.createBridgePrintJob.mockImplementation(async (_pool, input) => ({
      id: `job-${input.documentType}-${input.metadata?.kitchen_printer_slug ?? 'pickup'}`,
      document_type: input.documentType,
      metadata: input.metadata,
    }));
    mocks.logSoftwareEventBestEffort.mockResolvedValue(undefined);
  });

  it('enqueues pickup and one job per printer when pickup is enabled on a line', async () => {
    const result = await dispatchKitchenTicketsForCompletedOrder({} as never, {
      establishmentId: 'est-1',
      order: { id: 7, created_at: new Date('2026-07-01T12:00:00Z') },
      items: [
        {
          product_name: 'Mojito',
          quantity: 1,
          print_pickup_slip_snapshot: true,
          kitchen_printer_ids_snapshot: [{ id: 1, name: 'Bar', slug: 'bar' }],
        },
        {
          product_name: 'Entrecote',
          quantity: 1,
          kitchen_printer_ids_snapshot: [{ id: 2, name: 'Cuisine', slug: 'cuisine' }],
        },
      ],
    });

    expect(result.enqueued).toBe(3);
    expect(result.failures).toBe(0);
    expect(mocks.createBridgePrintJob).toHaveBeenCalledTimes(3);
    expect(mocks.createBridgePrintJob.mock.calls[0]?.[1]?.documentType).toBe('order_pickup_number');
    expect(mocks.createBridgePrintJob.mock.calls[0]?.[1]?.metadata).toMatchObject({
      order_id: 7,
      ticket_kind: 'pickup_number',
      kitchen_ticket_day_number: 3,
    });
    expect(mocks.createBridgePrintJob.mock.calls[1]?.[1]?.documentType).toBe('kitchen_order');
    expect(mocks.createBridgePrintJob.mock.calls[1]?.[1]?.metadata).toMatchObject({
      kitchen_printer_slug: 'bar',
      order_id: 7,
      kitchen_ticket_day_number: 3,
      ticket_kind: 'order',
    });
  });

  it('skips pickup when no line has print_pickup_slip_snapshot', async () => {
    const result = await dispatchKitchenTicketsForCompletedOrder({} as never, {
      establishmentId: 'est-1',
      order: { id: 10, created_at: new Date() },
      items: [
        {
          product_name: 'Mojito',
          quantity: 1,
          kitchen_printer_ids_snapshot: [{ id: 1, name: 'Bar', slug: 'bar' }],
        },
      ],
    });

    expect(result.enqueued).toBe(1);
    expect(mocks.allocateKitchenTicketDayNumber).toHaveBeenCalledTimes(1);
    expect(mocks.createBridgePrintJob).toHaveBeenCalledTimes(1);
    expect(mocks.createBridgePrintJob.mock.calls[0]?.[1]?.documentType).toBe('kitchen_order');
  });

  it('enqueues pickup only when kitchen printers are not assigned', async () => {
    const result = await dispatchKitchenTicketsForCompletedOrder({} as never, {
      establishmentId: 'est-1',
      order: { id: 11, created_at: new Date() },
      items: [
        {
          product_name: 'Cafe',
          quantity: 1,
          print_pickup_slip_snapshot: true,
          kitchen_printer_ids_snapshot: [],
        },
      ],
    });

    expect(result.enqueued).toBe(1);
    expect(mocks.allocateKitchenTicketDayNumber).not.toHaveBeenCalled();
    expect(mocks.createBridgePrintJob).toHaveBeenCalledTimes(1);
    expect(mocks.createBridgePrintJob.mock.calls[0]?.[1]?.documentType).toBe('order_pickup_number');
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
          print_pickup_slip_snapshot: true,
          kitchen_printer_ids_snapshot: [{ id: 1, name: 'Bar', slug: 'bar' }],
        },
      ],
      logger,
    });

    expect(result.enqueued).toBe(1);
    expect(result.failures).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(mocks.logSoftwareEventBestEffort).toHaveBeenCalled();
  });

  it('enqueues cancellation jobs referencing the original order id', async () => {
    const result = await dispatchKitchenTicketsForCancellation({} as never, {
      establishmentId: 'est-1',
      originalOrderId: 20,
      cancellationType: 'full',
      cancelledItems: [
        {
          product_name: 'Mojito',
          quantity: 1,
          kitchen_printer_ids_snapshot: [{ id: 1, name: 'Bar', slug: 'bar' }],
        },
      ],
    });

    expect(result.enqueued).toBe(1);
    expect(mocks.createBridgePrintJob.mock.calls[0]?.[1]?.documentType).toBe('kitchen_cancellation');
    expect(mocks.createBridgePrintJob.mock.calls[0]?.[1]?.metadata).toMatchObject({
      original_order_id: 20,
      kitchen_ticket_day_number: 3,
      ticket_kind: 'cancellation',
    });
  });
});
