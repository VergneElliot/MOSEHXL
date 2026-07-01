import type { Product } from '../../models/interfaces';
import { enrichProductsWithOptionCatalog } from '../productOptions/productOptionCatalogService';
import {
  KitchenPrinterModel,
  type KitchenPrinter,
} from '../../models/database/kitchenPrinterModel';

export interface ProductWithOperationalCatalog extends Product {
  option_group_ids: number[];
  option_groups: import('../../models/database/productOptionGroupModel').ProductOptionGroup[];
  kitchen_printer_ids: number[];
  kitchen_printers: KitchenPrinter[];
}

export async function enrichProductsWithKitchenPrinterCatalog<T extends Product>(
  products: T[],
  establishmentId: string
): Promise<Array<T & { kitchen_printer_ids: number[]; kitchen_printers: KitchenPrinter[] }>> {
  if (products.length === 0) return [];

  const productIds = products.map((product) => product.id);
  const [allPrinters, assignmentsByProduct] = await Promise.all([
    KitchenPrinterModel.getAllActive(establishmentId),
    KitchenPrinterModel.getAssignmentsForProducts(establishmentId, productIds),
  ]);

  const printersById = new Map(allPrinters.map((printer) => [printer.id, printer]));

  return products.map((product) => {
    const kitchenPrinterIds = (assignmentsByProduct.get(product.id) ?? []).map((printer) => printer.id);
    const kitchenPrinters = kitchenPrinterIds
      .map((printerId) => printersById.get(printerId))
      .filter((printer): printer is KitchenPrinter => printer != null);

    return {
      ...product,
      kitchen_printer_ids: kitchenPrinterIds,
      kitchen_printers: kitchenPrinters,
    };
  });
}

export async function enrichProductsWithOperationalCatalog(
  products: Product[],
  establishmentId: string
): Promise<ProductWithOperationalCatalog[]> {
  const withOptions = await enrichProductsWithOptionCatalog(products, establishmentId);
  return enrichProductsWithKitchenPrinterCatalog(withOptions, establishmentId);
}
