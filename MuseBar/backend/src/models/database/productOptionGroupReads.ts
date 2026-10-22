import { pool } from '../../db/pool';
import { loadChoicesForGroups, mapGroup } from './productOptionGroupMappers';
import type { ProductOptionGroup } from './productOptionGroupTypes';

export async function getAllActive(establishmentId: string): Promise<ProductOptionGroup[]> {
  const groupsResult = await pool.query(
    `SELECT *
     FROM product_option_groups
     WHERE establishment_id = $1 AND is_active = TRUE
     ORDER BY display_order, name, id`,
    [establishmentId]
  );
  const groupIds = groupsResult.rows.map((row) => Number(row.id));
  const choicesByGroup = await loadChoicesForGroups(establishmentId, groupIds);
  return groupsResult.rows.map((row) =>
    mapGroup(row, choicesByGroup.get(Number(row.id)) ?? [])
  );
}

export async function getById(id: number, establishmentId: string): Promise<ProductOptionGroup | null> {
  const result = await pool.query(
    `SELECT *
     FROM product_option_groups
     WHERE id = $1 AND establishment_id = $2 AND is_active = TRUE`,
    [id, establishmentId]
  );
  if (!result.rows[0]) return null;
  const choicesByGroup = await loadChoicesForGroups(establishmentId, [id]);
  return mapGroup(result.rows[0], choicesByGroup.get(id) ?? []);
}

export async function getAssignmentsForProducts(
  establishmentId: string,
  productIds: number[]
): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (productIds.length === 0) return map;

  const result = await pool.query(
    `SELECT p.product_id, p.group_id
     FROM product_option_group_products p
     JOIN product_option_groups g ON g.id = p.group_id
     WHERE p.establishment_id = $1
       AND p.product_id = ANY($2::int[])
       AND g.is_active = TRUE
     ORDER BY g.display_order, g.name, g.id`,
    [establishmentId, productIds]
  );

  for (const row of result.rows) {
    const productId = Number(row.product_id);
    const groupId = Number(row.group_id);
    const list = map.get(productId) ?? [];
    list.push(groupId);
    map.set(productId, list);
  }
  return map;
}
