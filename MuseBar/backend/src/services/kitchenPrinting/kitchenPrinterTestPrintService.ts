import type { Pool } from 'pg';

import { createBridgePrintJob } from '../../printing/bridgePrintJobRepo';
import type { KitchenPrinter } from '../../models/database/kitchenPrinterModel';
import { ESC_POS } from '../printing/types';

function buildKitchenTestTicket(printer: KitchenPrinter): string {
  const now = new Date().toLocaleString('fr-FR');
  const lines = [
    ESC_POS.INIT,
    ESC_POS.CENTER,
    ESC_POS.BOLD_ON,
    'TEST IMPRIMANTE',
    ESC_POS.BOLD_OFF,
    ESC_POS.LEFT,
  ];

  lines.push('', `Imprimante: ${printer.name}`, `Slug: ${printer.slug}`, `Type: ${printer.connection_type}`, '');
  if (printer.connection_type === 'network_escpos') {
    const host = typeof printer.connection_config.host === 'string' ? printer.connection_config.host : '';
    const port = printer.connection_config.port ?? 9100;
    lines.push(`Cible: ${host}:${port}`);
  } else {
    const bridgeTarget =
      typeof printer.connection_config.bridgeTarget === 'string'
        ? printer.connection_config.bridgeTarget
        : printer.slug;
    lines.push(`Cible bridge: ${bridgeTarget}`);
  }
  lines.push('', `Date: ${now}`, '', 'Ticket de test cuisine/bar', '', ESC_POS.PARTIAL_CUT);
  return lines.join('\n');
}

export async function enqueueKitchenPrinterTestPrint(
  pool: Pool,
  establishmentId: string,
  printer: KitchenPrinter,
  createdByUserId?: number
): Promise<{ jobId: string }> {
  const payload = buildKitchenTestTicket(printer);
  const job = await createBridgePrintJob(pool, {
    establishmentId,
    documentType: 'kitchen_test',
    payloadFormat: 'escpos',
    payloadBase64: Buffer.from(payload, 'latin1').toString('base64'),
    createdByUserId: createdByUserId ?? null,
    metadata: {
      kitchen_printer_id: printer.id,
      kitchen_printer_slug: printer.slug,
      kitchen_printer_name: printer.name,
      ticket_kind: 'test',
    },
  });
  return { jobId: job.id };
}
