import type { Pool } from 'pg';

import { createBridgePrintJob } from '../../printing/bridgePrintJobRepo';
import { logSoftwareEventBestEffort } from '../legal/softwareEventJournal';
import {
  allocateKitchenTicketDayNumber,
  getKitchenTicketDayNumberForOrder,
} from './kitchenTicketDayNumberService';
import { groupKitchenTicketLinesByPrinter, consolidateKitchenTicketLinesForPrint, type KitchenDispatchOrderItem } from './kitchenTicketGrouping';
import {
  renderCustomerOrderNumberTicket,
  renderKitchenOrderTicket,
  renderKitchenCancellationTicket,
} from './kitchenTicketRenderer';

interface KitchenDispatchLogger {
  error: (message: string, error: Error, category?: string) => void;
}

export interface DispatchKitchenTicketsInput {
  establishmentId: string;
  order: { id: number; created_at: Date };
  items: KitchenDispatchOrderItem[];
  createdByUserId?: number;
  logger?: KitchenDispatchLogger;
}

export interface DispatchKitchenTicketsResult {
  enqueued: number;
  failures: number;
  jobIds: string[];
}

function shouldPrintPickupSlip(items: KitchenDispatchOrderItem[]): boolean {
  return items.some((item) => item.print_pickup_slip_snapshot === true);
}

export async function dispatchKitchenTicketsForCompletedOrder(
  pool: Pool,
  input: DispatchKitchenTicketsInput
): Promise<DispatchKitchenTicketsResult> {
  const groups = groupKitchenTicketLinesByPrinter(input.items);
  const wantsPickup = shouldPrintPickupSlip(input.items);
  const jobIds: string[] = [];
  let failures = 0;

  if (groups.length === 0 && !wantsPickup) {
    return { enqueued: 0, failures: 0, jobIds };
  }

  let ticketDayNumber: number | null = null;
  if (groups.length > 0) {
    try {
      ticketDayNumber = await allocateKitchenTicketDayNumber(pool, {
        establishmentId: input.establishmentId,
        orderId: input.order.id,
        referenceDate: input.order.created_at,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      input.logger?.error(
        `Failed to allocate kitchen ticket day number for order ${input.order.id}`,
        err,
        'KITCHEN_PRINT'
      );
      await logSoftwareEventBestEffort({
        establishmentId: input.establishmentId,
        eventType: 'KITCHEN_TICKET_ENQUEUE_FAILED',
        eventData: {
          order_id: input.order.id,
          ticket_kind: 'day_number_allocation',
          error: err.message,
        },
        userId: input.createdByUserId != null ? String(input.createdByUserId) : undefined,
      });
    }
  }

  if (wantsPickup) {
    try {
      const pickupDisplayNumber = ticketDayNumber ?? input.order.id;
      const pickupPayload = renderCustomerOrderNumberTicket(pickupDisplayNumber);
      const pickupJob = await createBridgePrintJob(pool, {
        establishmentId: input.establishmentId,
        documentType: 'order_pickup_number',
        payloadFormat: 'escpos',
        payloadBase64: Buffer.from(pickupPayload, 'latin1').toString('base64'),
        createdByUserId: input.createdByUserId ?? null,
        metadata: {
          order_id: input.order.id,
          ticket_kind: 'pickup_number',
          ...(ticketDayNumber != null ? { kitchen_ticket_day_number: ticketDayNumber } : {}),
        },
      });
      jobIds.push(pickupJob.id);
    } catch (error) {
      failures += 1;
      const err = error instanceof Error ? error : new Error(String(error));
      input.logger?.error(
        `Failed to enqueue customer pickup number ticket for order ${input.order.id}`,
        err,
        'KITCHEN_PRINT'
      );
      await logSoftwareEventBestEffort({
        establishmentId: input.establishmentId,
        eventType: 'KITCHEN_TICKET_ENQUEUE_FAILED',
        eventData: {
          order_id: input.order.id,
          ticket_kind: 'pickup_number',
          error: err.message,
        },
        userId: input.createdByUserId != null ? String(input.createdByUserId) : undefined,
      });
    }
  }

  for (const group of groups) {
    const printLines = consolidateKitchenTicketLinesForPrint(group.lines);
    try {
      const payload = renderKitchenOrderTicket({
        ticketDayNumber: ticketDayNumber ?? input.order.id,
        createdAt: input.order.created_at,
        printerName: group.printer.name,
        lines: printLines,
      });
      const job = await createBridgePrintJob(pool, {
        establishmentId: input.establishmentId,
        documentType: 'kitchen_order',
        payloadFormat: 'escpos',
        payloadBase64: Buffer.from(payload, 'latin1').toString('base64'),
        createdByUserId: input.createdByUserId ?? null,
        metadata: {
          kitchen_printer_id: group.printer.id,
          kitchen_printer_slug: group.printer.slug,
          kitchen_printer_name: group.printer.name,
          order_id: input.order.id,
          kitchen_ticket_day_number: ticketDayNumber ?? undefined,
          ticket_kind: 'order',
          lines: printLines.map((line) => ({
            quantity: line.quantity,
            product_name: line.product_name,
            options: line.options,
            option_variants: line.option_variants,
          })),
        },
      });
      jobIds.push(job.id);
    } catch (error) {
      failures += 1;
      const err = error instanceof Error ? error : new Error(String(error));
      input.logger?.error(
        `Failed to enqueue kitchen ticket for order ${input.order.id} printer ${group.printer.slug}`,
        err,
        'KITCHEN_PRINT'
      );
      await logSoftwareEventBestEffort({
        establishmentId: input.establishmentId,
        eventType: 'KITCHEN_TICKET_ENQUEUE_FAILED',
        eventData: {
          order_id: input.order.id,
          kitchen_printer_id: group.printer.id,
          kitchen_printer_slug: group.printer.slug,
          error: err.message,
        },
        userId: input.createdByUserId != null ? String(input.createdByUserId) : undefined,
      });
    }
  }

  return { enqueued: jobIds.length, failures, jobIds };
}

export async function dispatchKitchenTicketsForCancellation(
  pool: Pool,
  input: {
    establishmentId: string;
    originalOrderId: number;
    cancellationType: 'full' | 'partial' | 'items-only';
    cancelledItems: KitchenDispatchOrderItem[];
    createdByUserId?: number;
    logger?: KitchenDispatchLogger;
  }
): Promise<DispatchKitchenTicketsResult> {
  const groups = groupKitchenTicketLinesByPrinter(input.cancelledItems);
  const jobIds: string[] = [];
  let failures = 0;
  const createdAt = new Date();
  const ticketDayNumber = await getKitchenTicketDayNumberForOrder(
    pool,
    input.establishmentId,
    input.originalOrderId
  );
  const displayNumber = ticketDayNumber ?? input.originalOrderId;

  for (const group of groups) {
    const printLines = consolidateKitchenTicketLinesForPrint(group.lines);
    try {
      const payload = renderKitchenCancellationTicket({
        ticketDayNumber: displayNumber,
        createdAt,
        printerName: group.printer.name,
        cancellationType: input.cancellationType,
        lines: printLines,
      });
      const job = await createBridgePrintJob(pool, {
        establishmentId: input.establishmentId,
        documentType: 'kitchen_cancellation',
        payloadFormat: 'escpos',
        payloadBase64: Buffer.from(payload, 'latin1').toString('base64'),
        createdByUserId: input.createdByUserId ?? null,
        metadata: {
          kitchen_printer_id: group.printer.id,
          kitchen_printer_slug: group.printer.slug,
          kitchen_printer_name: group.printer.name,
          order_id: input.originalOrderId,
          original_order_id: input.originalOrderId,
          ...(ticketDayNumber != null ? { kitchen_ticket_day_number: ticketDayNumber } : {}),
          ticket_kind: 'cancellation',
          cancellation_type: input.cancellationType,
          lines: printLines.map((line) => ({
            quantity: line.quantity,
            product_name: line.product_name,
            options: line.options,
            option_variants: line.option_variants,
          })),
        },
      });
      jobIds.push(job.id);
    } catch (error) {
      failures += 1;
      const err = error instanceof Error ? error : new Error(String(error));
      input.logger?.error(
        `Failed to enqueue kitchen cancellation ticket for order ${input.originalOrderId} printer ${group.printer.slug}`,
        err,
        'KITCHEN_PRINT'
      );
      await logSoftwareEventBestEffort({
        establishmentId: input.establishmentId,
        eventType: 'KITCHEN_TICKET_ENQUEUE_FAILED',
        eventData: {
          order_id: input.originalOrderId,
          kitchen_printer_id: group.printer.id,
          kitchen_printer_slug: group.printer.slug,
          ticket_kind: 'cancellation',
          error: err.message,
        },
        userId: input.createdByUserId != null ? String(input.createdByUserId) : undefined,
      });
    }
  }

  return { enqueued: jobIds.length, failures, jobIds };
}
