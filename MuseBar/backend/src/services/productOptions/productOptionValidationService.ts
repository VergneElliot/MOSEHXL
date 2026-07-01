import {
  ProductOptionGroupModel,
  type ProductOptionGroup,
} from '../../models/database/productOptionGroupModel';
import type { OrderItemOptionSnapshotInput } from '../../models/database/orderItemOptionModel';
import {
  AD_HOC_LINE_NOTE_DISPLAY_ORDER,
  AD_HOC_LINE_NOTE_GROUP_NAME,
  AD_HOC_LINE_NOTE_MAX_LENGTH,
} from './lineItemNote';

export interface CreateOrderItemOptionInput {
  group_id?: number | null;
  choice_id?: number | null;
  free_text?: string | null;
}

export interface ValidatedOrderItemOptions {
  snapshots: OrderItemOptionSnapshotInput[];
}

function normalizeFreeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function findChoice(group: ProductOptionGroup, choiceId: number) {
  return group.choices.find((choice) => choice.id === choiceId && choice.is_active);
}

export function validateOrderItemOptionsForProduct(
  productId: number | undefined,
  productName: string,
  optionsInput: CreateOrderItemOptionInput[] | undefined,
  assignedGroups: ProductOptionGroup[]
): { ok: true; value: ValidatedOrderItemOptions } | { ok: false; error: string } {
  const options = optionsInput ?? [];

  if (productId == null) {
    if (options.length > 0) {
      return {
        ok: false,
        error: `Options are not supported for custom line "${productName}"`,
      };
    }
    return { ok: true, value: { snapshots: [] } };
  }

  const assignedById = new Map(assignedGroups.map((group) => [group.id, group]));
  const providedByGroup = new Map<number, CreateOrderItemOptionInput>();
  let adHocLineNote: string | null = null;

  for (const option of options) {
    const rawGroupId = option.group_id;
    if (rawGroupId == null) {
      const freeText = normalizeFreeText(option.free_text, AD_HOC_LINE_NOTE_MAX_LENGTH);
      if (!freeText) {
        return {
          ok: false,
          error: `Line note is empty on "${productName}"`,
        };
      }
      if (option.choice_id != null) {
        return {
          ok: false,
          error: `Preset choices are not allowed on ad-hoc line notes for "${productName}"`,
        };
      }
      if (adHocLineNote != null) {
        return {
          ok: false,
          error: `Only one line note is allowed on "${productName}"`,
        };
      }
      adHocLineNote = freeText;
      continue;
    }

    const groupId = Number(rawGroupId);
    if (!Number.isInteger(groupId) || groupId < 1) {
      return { ok: false, error: `Invalid option group on line "${productName}"` };
    }
    if (providedByGroup.has(groupId)) {
      return {
        ok: false,
        error: `Duplicate option group "${assignedById.get(groupId)?.name ?? groupId}" on line "${productName}"`,
      };
    }
    if (!assignedById.has(groupId)) {
      return {
        ok: false,
        error: `Option group is not assigned to product "${productName}"`,
      };
    }
    providedByGroup.set(groupId, option);
  }

  const snapshots: OrderItemOptionSnapshotInput[] = [];

  for (const group of assignedGroups.sort((a, b) => a.display_order - b.display_order)) {
    const provided = providedByGroup.get(group.id);
    const freeText = normalizeFreeText(provided?.free_text, group.free_text_max_length);
    const choiceId =
      provided?.choice_id != null && Number.isInteger(Number(provided.choice_id))
        ? Number(provided.choice_id)
        : null;
    const choice = choiceId != null ? findChoice(group, choiceId) : undefined;

    if (provided) {
      if (choiceId != null && !choice) {
        return {
          ok: false,
          error: `Invalid preset for "${group.name}" on line "${productName}"`,
        };
      }
      if (freeText && !group.allow_free_text) {
        return {
          ok: false,
          error: `Free text is not allowed for "${group.name}" on line "${productName}"`,
        };
      }
      if (choiceId != null && freeText) {
        return {
          ok: false,
          error: `Choose either a preset or free text for "${group.name}" on line "${productName}"`,
        };
      }
      if (!choiceId && !freeText) {
        return {
          ok: false,
          error: `Option "${group.name}" is empty on line "${productName}"`,
        };
      }

      snapshots.push({
        group_id: group.id,
        group_name_snapshot: group.name,
        choice_id: choice?.id ?? null,
        choice_label_snapshot: choice?.label ?? null,
        free_text: freeText,
        display_order: group.display_order,
      });
      continue;
    }

    if (group.is_required) {
      return {
        ok: false,
        error: `Missing required option "${group.name}" for "${productName}"`,
      };
    }
  }

  if (adHocLineNote) {
    snapshots.push({
      group_id: null,
      group_name_snapshot: AD_HOC_LINE_NOTE_GROUP_NAME,
      choice_id: null,
      choice_label_snapshot: null,
      free_text: adHocLineNote,
      display_order: AD_HOC_LINE_NOTE_DISPLAY_ORDER,
    });
  }

  return { ok: true, value: { snapshots } };
}

export async function loadAssignedGroupsByProduct(
  establishmentId: string,
  productIds: number[]
): Promise<Map<number, ProductOptionGroup[]>> {
  const uniqueProductIds = [...new Set(productIds.filter((id) => Number.isInteger(id) && id > 0))];
  const map = new Map<number, ProductOptionGroup[]>();
  if (uniqueProductIds.length === 0) return map;

  const [allGroups, assignments] = await Promise.all([
    ProductOptionGroupModel.getAllActive(establishmentId),
    ProductOptionGroupModel.getAssignmentsForProducts(establishmentId, uniqueProductIds),
  ]);
  const groupsById = new Map(allGroups.map((group) => [group.id, group]));

  for (const productId of uniqueProductIds) {
    const groupIds = assignments.get(productId) ?? [];
    map.set(
      productId,
      groupIds
        .map((groupId) => groupsById.get(groupId))
        .filter((group): group is ProductOptionGroup => group != null)
    );
  }
  return map;
}
