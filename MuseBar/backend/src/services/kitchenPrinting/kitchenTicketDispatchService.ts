import type { Pool } from 'pg';

import { createBridgePrintJob } from '../../printing/bridgePrintJobRepo';
import { logSoftwareEventBestEffort } from '../legal/softwareEventJournal';
import { groupKitchenTicketLinesByPrinter, type KitchenDispatchOrderItem } from './kitchenTicketGrouping';
import { renderKitchenOrderTicket } from './kitchenTicketRenderer';

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

export async function dispatchKitchenTicketsForCompletedOrder(
  pool: Pool,
  input: DispatchKitchenTicketsInput
): Promise<DispatchKitchenTicketsResult> {
  const groups = groupKitchenTicketLinesByPrinter(input.items);
  const jobIds: string[] = [];
  let failures = 0;

  for (const group of groups) {
    try {
      const payload = renderKitchenOrderTicket({
        orderId: input.order.id,
        createdAt: input.order.created_at,
        printerName: group.printer.name,
        lines: group.lines,
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
          ticket_kind: 'order',
          lines: group.lines.map((line) => ({
            quantity: line.quantity,
            product_name: line.product_name,
            options: line.options,
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
