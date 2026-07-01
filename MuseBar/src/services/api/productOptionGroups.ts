import { request } from './core';
import type { ProductOptionGroupRecord } from '@mosehxl/types';
import { ProductOptionGroup } from '../../types';

export interface ProductOptionGroupFormInput {
  name: string;
  isRequired: boolean;
  allowFreeText: boolean;
  freeTextLabel?: string;
  freeTextMaxLength?: number;
  displayOrder?: number;
  choices: Array<{ id?: string; label: string; displayOrder?: number }>;
}

function mapChoice(choice: ProductOptionGroupRecord['choices'][number]) {
  return {
    id: String(choice.id),
    groupId: String(choice.group_id),
    label: choice.label,
    displayOrder: choice.display_order,
    isActive: choice.is_active !== false,
  };
}

function mapGroup(group: ProductOptionGroupRecord): ProductOptionGroup {
  return {
    id: String(group.id),
    name: group.name,
    isRequired: group.is_required === true,
    allowFreeText: group.allow_free_text === true,
    freeTextLabel: group.free_text_label ?? null,
    freeTextMaxLength: group.free_text_max_length ?? 120,
    displayOrder: group.display_order ?? 0,
    isActive: group.is_active !== false,
    choices: (group.choices ?? []).map(mapChoice),
  };
}

export async function getProductOptionGroups(): Promise<ProductOptionGroup[]> {
  const groups = await request<ProductOptionGroupRecord[]>('/product-option-groups');
  return groups.map(mapGroup);
}

export async function createProductOptionGroup(input: ProductOptionGroupFormInput): Promise<ProductOptionGroup> {
  const result = await request<ProductOptionGroupRecord>('/product-option-groups', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      is_required: input.isRequired,
      allow_free_text: input.allowFreeText,
      free_text_label: input.freeTextLabel?.trim() || null,
      free_text_max_length: input.freeTextMaxLength ?? 120,
      display_order: input.displayOrder ?? 0,
      choices: input.choices
        .filter((choice) => choice.label.trim())
        .map((choice, index) => ({
          id: choice.id ? Number(choice.id) : undefined,
          label: choice.label.trim(),
          display_order: choice.displayOrder ?? index,
        })),
    }),
  });
  return mapGroup(result);
}

export async function updateProductOptionGroup(
  id: string,
  input: ProductOptionGroupFormInput
): Promise<ProductOptionGroup> {
  const result = await request<ProductOptionGroupRecord>(`/product-option-groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: input.name,
      is_required: input.isRequired,
      allow_free_text: input.allowFreeText,
      free_text_label: input.freeTextLabel?.trim() || null,
      free_text_max_length: input.freeTextMaxLength ?? 120,
      display_order: input.displayOrder ?? 0,
      choices: input.choices
        .filter((choice) => choice.label.trim())
        .map((choice, index) => ({
          id: choice.id ? Number(choice.id) : undefined,
          label: choice.label.trim(),
          display_order: choice.displayOrder ?? index,
        })),
    }),
  });
  return mapGroup(result);
}

export async function deleteProductOptionGroup(id: string): Promise<{ message?: string; action?: string }> {
  return request(`/product-option-groups/${id}`, { method: 'DELETE' });
}
