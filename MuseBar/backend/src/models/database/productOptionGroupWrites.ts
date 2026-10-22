import type { PoolClient } from 'pg';

import { pool } from '../../db/pool';
import { getById } from './productOptionGroupReads';
import type {
  CreateProductOptionGroupInput,
  ProductOptionGroup,
  UpdateProductOptionGroupInput,
} from './productOptionGroupTypes';

async function syncChoices(
  client: PoolClient,
  establishmentId: string,
  groupId: number,
  choices: NonNullable<UpdateProductOptionGroupInput['choices']>
): Promise<void> {
  const existing = await client.query(
    `SELECT id FROM product_option_choices WHERE group_id = $1 AND establishment_id = $2`,
    [groupId, establishmentId]
  );
  const existingIds = new Set(existing.rows.map((row) => Number(row.id)));
  const keepIds = new Set<number>();

  for (let index = 0; index < choices.length; index += 1) {
    const choice = choices[index];
    if (!choice) continue;
    const displayOrder = choice.display_order ?? index;
    if (choice.id && existingIds.has(choice.id)) {
      keepIds.add(choice.id);
      await client.query(
        `UPDATE product_option_choices
         SET label = $1,
             display_order = $2,
             is_active = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND group_id = $5 AND establishment_id = $6`,
        [choice.label, displayOrder, choice.is_active !== false, choice.id, groupId, establishmentId]
      );
    } else {
      await client.query(
        `INSERT INTO product_option_choices (
           group_id, establishment_id, label, display_order, is_active
         ) VALUES ($1, $2, $3, $4, TRUE)`,
        [groupId, establishmentId, choice.label, displayOrder]
      );
    }
  }

  const toDeactivate = [...existingIds].filter((id) => !keepIds.has(id));
  if (toDeactivate.length > 0) {
    await client.query(
      `UPDATE product_option_choices
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE group_id = $1 AND establishment_id = $2 AND id = ANY($3::int[])`,
      [groupId, establishmentId, toDeactivate]
    );
  }
}

export async function create(
  input: CreateProductOptionGroupInput,
  establishmentId: string
): Promise<ProductOptionGroup> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO product_option_groups (
         establishment_id, name, is_required, allow_free_text,
         free_text_label, free_text_max_length, display_order, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       RETURNING *`,
      [
        establishmentId,
        input.name.trim(),
        input.is_required === true,
        input.allow_free_text === true,
        input.free_text_label?.trim() || null,
        input.free_text_max_length ?? 120,
        input.display_order ?? 0,
      ]
    );
    const groupId = Number(result.rows[0].id);
    if (input.choices?.length) {
      await syncChoices(
        client,
        establishmentId,
        groupId,
        input.choices.map((choice, index) => ({
          label: choice.label.trim(),
          display_order: choice.display_order ?? index,
        }))
      );
    }
    await client.query('COMMIT');
    const created = await getById(groupId, establishmentId);
    if (!created) throw new Error('Failed to load created option group');
    return created;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function update(
  id: number,
  input: UpdateProductOptionGroupInput,
  establishmentId: string
): Promise<ProductOptionGroup | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: unknown[] = [id, establishmentId];
    let paramIndex = 3;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name.trim());
    }
    if (input.is_required !== undefined) {
      updates.push(`is_required = $${paramIndex++}`);
      values.push(input.is_required);
    }
    if (input.allow_free_text !== undefined) {
      updates.push(`allow_free_text = $${paramIndex++}`);
      values.push(input.allow_free_text);
    }
    if (input.free_text_label !== undefined) {
      updates.push(`free_text_label = $${paramIndex++}`);
      values.push(input.free_text_label?.trim() || null);
    }
    if (input.free_text_max_length !== undefined) {
      updates.push(`free_text_max_length = $${paramIndex++}`);
      values.push(input.free_text_max_length);
    }
    if (input.display_order !== undefined) {
      updates.push(`display_order = $${paramIndex++}`);
      values.push(input.display_order);
    }
    if (input.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.is_active);
    }

    if (updates.length > 1) {
      await client.query(
        `UPDATE product_option_groups
         SET ${updates.join(', ')}
         WHERE id = $1 AND establishment_id = $2`,
        values
      );
    }

    if (input.choices) {
      await syncChoices(client, establishmentId, id, input.choices);
    }

    await client.query('COMMIT');
    return getById(id, establishmentId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteProductOptionGroup(
  id: number,
  establishmentId: string
): Promise<{ deleted: boolean; action: 'hard' | 'soft' }> {
  const assignmentCount = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM product_option_group_products
     WHERE group_id = $1 AND establishment_id = $2`,
    [id, establishmentId]
  );
  const assigned = Number(assignmentCount.rows[0]?.count ?? 0) > 0;
  if (assigned) {
    const result = await pool.query(
      `UPDATE product_option_groups
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND establishment_id = $2`,
      [id, establishmentId]
    );
    return { deleted: (result.rowCount || 0) > 0, action: 'soft' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM product_option_group_products WHERE group_id = $1 AND establishment_id = $2`,
      [id, establishmentId]
    );
    await client.query(
      `DELETE FROM product_option_choices WHERE group_id = $1 AND establishment_id = $2`,
      [id, establishmentId]
    );
    const result = await client.query(
      `DELETE FROM product_option_groups WHERE id = $1 AND establishment_id = $2`,
      [id, establishmentId]
    );
    await client.query('COMMIT');
    return { deleted: (result.rowCount || 0) > 0, action: 'hard' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function setProductAssignments(
  productId: number,
  groupIds: number[],
  establishmentId: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM product_option_group_products
       WHERE product_id = $1 AND establishment_id = $2`,
      [productId, establishmentId]
    );

    if (groupIds.length > 0) {
      const validGroups = await client.query(
        `SELECT id
         FROM product_option_groups
         WHERE establishment_id = $1
           AND is_active = TRUE
           AND id = ANY($2::int[])`,
        [establishmentId, groupIds]
      );
      const validIds = validGroups.rows.map((row) => Number(row.id));
      for (const groupId of validIds) {
        await client.query(
          `INSERT INTO product_option_group_products (product_id, group_id, establishment_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (product_id, group_id) DO NOTHING`,
          [productId, groupId, establishmentId]
        );
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
