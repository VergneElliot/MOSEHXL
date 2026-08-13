import {
  KitchenPrinterModel,
  type KitchenPrinter,
} from '../../models/database/kitchenPrinterModel';

export interface KitchenPrinterLineSnapshot {
  id: number;
  name: string;
  slug: string;
}

export function toKitchenPrinterLineSnapshots(printers: KitchenPrinter[]): KitchenPrinterLineSnapshot[] {
  return printers.map((printer) => ({
    id: printer.id,
    name: printer.name,
    slug: printer.slug,
  }));
}

export async function loadKitchenPrinterSnapshotsByProduct(
  establishmentId: string,
  productIds: number[]
): Promise<Map<number, KitchenPrinterLineSnapshot[]>> {
  const assignments = await KitchenPrinterModel.getAssignmentsForProducts(establishmentId, productIds);
  const map = new Map<number, KitchenPrinterLineSnapshot[]>();
  for (const [productId, printers] of assignments.entries()) {
    map.set(productId, toKitchenPrinterLineSnapshots(printers));
  }
  return map;
}

/**
 * Establishment "default" kitchen printer: first active by display_order / name / id.
 * Used when a line has an ad-hoc note but no product kitchen-printer assignment.
 */
export async function loadDefaultKitchenPrinterSnapshot(
  establishmentId: string
): Promise<KitchenPrinterLineSnapshot | null> {
  const printers = await KitchenPrinterModel.getAllActive(establishmentId);
  const first = printers[0];
  if (!first) return null;
  return { id: first.id, name: first.name, slug: first.slug };
}
