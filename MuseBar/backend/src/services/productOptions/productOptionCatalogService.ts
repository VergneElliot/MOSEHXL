import type { Product } from '../../models/interfaces';
import {
  ProductOptionGroupModel,
  type ProductOptionGroup,
} from '../../models/database/productOptionGroupModel';

export interface ProductWithOptionCatalog extends Product {
  option_group_ids: number[];
  option_groups: ProductOptionGroup[];
}

export async function enrichProductsWithOptionCatalog(
  products: Product[],
  establishmentId: string
): Promise<ProductWithOptionCatalog[]> {
  if (products.length === 0) return [];

  const productIds = products.map((product) => product.id);
  const [allGroups, assignmentsByProduct] = await Promise.all([
    ProductOptionGroupModel.getAllActive(establishmentId),
    ProductOptionGroupModel.getAssignmentsForProducts(establishmentId, productIds),
  ]);

  const groupsById = new Map(allGroups.map((group) => [group.id, group]));

  return products.map((product) => {
    const optionGroupIds = assignmentsByProduct.get(product.id) ?? [];
    const optionGroups = optionGroupIds
      .map((groupId) => groupsById.get(groupId))
      .filter((group): group is ProductOptionGroup => group != null);

    return {
      ...product,
      option_group_ids: optionGroupIds,
      option_groups: optionGroups,
    };
  });
}
