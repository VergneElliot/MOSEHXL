import { request } from './core';
import type { KitchenPrinterRecord } from '@mosehxl/types';
import { KitchenPrinter } from '../../types';

export interface KitchenPrinterFormInput {
  name: string;
  slug?: string;
  connectionType: 'bridge' | 'network_escpos';
  connectionConfig: {
    host?: string;
    port?: number;
    bridgeTarget?: string;
  };
  displayOrder?: number;
}

function mapPrinter(printer: KitchenPrinterRecord): KitchenPrinter {
  const config = printer.connection_config ?? {};
  return {
    id: String(printer.id),
    name: printer.name,
    slug: printer.slug,
    connectionType: printer.connection_type,
    connectionConfig: {
      host: typeof config.host === 'string' ? config.host : undefined,
      port: typeof config.port === 'number' ? config.port : undefined,
      bridgeTarget: typeof config.bridgeTarget === 'string' ? config.bridgeTarget : undefined,
    },
    displayOrder: printer.display_order ?? 0,
    isActive: printer.is_active !== false,
  };
}

export async function getKitchenPrinters(): Promise<KitchenPrinter[]> {
  const printers = await request<KitchenPrinterRecord[]>('/kitchen-printers');
  return printers.map(mapPrinter);
}

export async function createKitchenPrinter(input: KitchenPrinterFormInput): Promise<KitchenPrinter> {
  const result = await request<KitchenPrinterRecord>('/kitchen-printers', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      slug: input.slug?.trim() || undefined,
      connection_type: input.connectionType,
      connection_config: input.connectionConfig,
      display_order: input.displayOrder ?? 0,
    }),
  });
  return mapPrinter(result);
}

export async function updateKitchenPrinter(
  id: string,
  input: KitchenPrinterFormInput
): Promise<KitchenPrinter> {
  const result = await request<KitchenPrinterRecord>(`/kitchen-printers/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: input.name,
      slug: input.slug?.trim() || undefined,
      connection_type: input.connectionType,
      connection_config: input.connectionConfig,
      display_order: input.displayOrder ?? 0,
    }),
  });
  return mapPrinter(result);
}

export async function deleteKitchenPrinter(id: string): Promise<{ message?: string; action?: string }> {
  return request(`/kitchen-printers/${id}`, { method: 'DELETE' });
}

export async function testKitchenPrinter(id: string): Promise<{ message?: string; job_id?: string }> {
  return request(`/kitchen-printers/${id}/test-print`, { method: 'POST' });
}
