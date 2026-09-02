import type { Pool } from 'pg';

import { createBridgePrintJob } from '../../printing/bridgePrintJobRepo';
import { logSoftwareEventBestEffort } from '../legal/softwareEventJournal';
import {
  groupKitchenTicketLinesByPrinter,
  consolidateKitchenTicketLinesForPrint,
  type KitchenDispatchOrderItem,
} from './kitchenTicketGrouping';
import { renderKitchenRetourTicket } from './kitchenTicketRenderer';
import {
  loadKitchenPrinterSnapshotsByProduct,
} from './kitchenPrinterSnapshot';
import { ProductModel } from '../../models/database/productModel';

interface RetourLogger {
  error: (message: string, error: Error, category?: string) => void;
}

export async function dispatchKitchenRetourTickets(
  pool: Pool,
  input: {
    establishmentId: string;
    ticketId: number;
    tableLabel?: string | null;
    items: KitchenDispatchOrderItem[];
    createdByUserId?: number;
    logger?: RetourLogger;
  }
): Promise<{ enqueued: number; failures: number; jobIds: string[] }> {
  const productIds = input.items
    .map((item) => item.product_id)
    .filter((id): id is number => id != null && Number.isInteger(id) && id > 0);

  const printersByProduct = await loadKitchenPrinterSnapshotsByProduct(
    input.establishmentId,
    productIds
  );
  const printPickupByProduct = await ProductModel.getPrintPickupSlipFlags(
    input.establishmentId,
    productIds
  );

  const enriched: KitchenDispatchOrderItem[] = input.items.map((item) => {
    let snapshot = item.kitchen_printer_ids_snapshot;
    const parsedEmpty =
      snapshot == null ||
      (Array.isArray(snapshot) && snapshot.length === 0) ||
      snapshot === '[]';
    if (parsedEmpty && item.product_id != null) {
      snapshot = printersByProduct.get(item.product_id) ?? [];
    }
    return {
      ...item,
      kitchen_printer_ids_snapshot: snapshot,
      print_pickup_slip_snapshot:
        item.print_pickup_slip_snapshot === true ||
        (item.product_id != null && printPickupByProduct.get(item.product_id) === true),
    };
  });

  const groups = groupKitchenTicketLinesByPrinter(enriched);
  const jobIds: string[] = [];
  let failures = 0;
  const now = new Date();

  for (const group of groups) {
    const printLines = consolidateKitchenTicketLinesForPrint(group.lines);
    try {
      const payload = renderKitchenRetourTicket({
        ticketId: input.ticketId,
        createdAt: now,
        printerName: group.printer.name,
        lines: printLines,
        tableLabel: input.tableLabel,
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
          ticket_kind: 'retour',
          open_ticket_id: input.ticketId,
          table_label: input.tableLabel ?? null,
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
        `Failed to enqueue retour ticket for printer ${group.printer.slug}`,
        err,
        'KITCHEN_PRINT'
      );
      await logSoftwareEventBestEffort({
        establishmentId: input.establishmentId,
        eventType: 'KITCHEN_TICKET_ENQUEUE_FAILED',
        eventData: {
          ticket_kind: 'retour',
          open_ticket_id: input.ticketId,
          kitchen_printer_id: group.printer.id,
          error: err.message,
        },
        userId: input.createdByUserId != null ? String(input.createdByUserId) : undefined,
      });
    }
  }

  return { enqueued: jobIds.length, failures, jobIds };
}
