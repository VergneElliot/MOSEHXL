import { pool } from '../../db/pool';
import type { ProductOptionChoice, ProductOptionGroup } from './productOptionGroupTypes';

export function mapChoice(row: Record<string, unknown>): ProductOptionChoice {
  return {
    id: Number(row.id),
    group_id: Number(row.group_id),
    establishment_id: String(row.establishment_id),
    label: String(row.label),
    display_order: Number(row.display_order ?? 0),
    is_active: row.is_active !== false,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  };
}

export function mapGroup(row: Record<string, unknown>, choices: ProductOptionChoice[] = []): ProductOptionGroup {
  return {
    id: Number(row.id),
    establishment_id: String(row.establishment_id),
    name: String(row.name),
    is_required: row.is_required === true,
    allow_free_text: row.allow_free_text === true,
    free_text_label: typeof row.free_text_label === 'string' ? row.free_text_label : null,
    free_text_max_length: Number(row.free_text_max_length ?? 120),
    display_order: Number(row.display_order ?? 0),
    is_active: row.is_active !== false,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
    choices,
  };
}

export async function loadChoicesForGroups(
  establishmentId: string,
  groupIds: number[],
  includeInactive = false
): Promise<Map<number, ProductOptionChoice[]>> {
  const map = new Map<number, ProductOptionChoice[]>();
  if (groupIds.length === 0) return map;

  const activeClause = includeInactive ? '' : 'AND is_active = TRUE';
  const result = await pool.query(
    `SELECT *
     FROM product_option_choices
     WHERE establishment_id = $1
       AND group_id = ANY($2::int[])
       ${activeClause}
     ORDER BY display_order, id`,
    [establishmentId, groupIds]
  );

  for (const row of result.rows) {
    const choice = mapChoice(row);
    const list = map.get(choice.group_id) ?? [];
    list.push(choice);
    map.set(choice.group_id, list);
  }
  return map;
}
