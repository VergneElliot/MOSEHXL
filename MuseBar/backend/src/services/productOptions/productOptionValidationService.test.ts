import { describe, expect, it } from 'vitest';

import { validateOrderItemOptionsForProduct } from './productOptionValidationService';
import type { ProductOptionGroup } from '../../models/database/productOptionGroupModel';

const cuissonGroup: ProductOptionGroup = {
  id: 1,
  establishment_id: 'est-1',
  name: 'Cuisson',
  is_required: true,
  allow_free_text: false,
  free_text_label: null,
  free_text_max_length: 120,
  display_order: 0,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  choices: [
    {
      id: 10,
      group_id: 1,
      establishment_id: 'est-1',
      label: 'Saignant',
      display_order: 0,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 11,
      group_id: 1,
      establishment_id: 'est-1',
      label: 'Bien cuit',
      display_order: 1,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],
};

const noteGroup: ProductOptionGroup = {
  id: 2,
  establishment_id: 'est-1',
  name: 'Note',
  is_required: false,
  allow_free_text: true,
  free_text_label: 'Note pour le bar',
  free_text_max_length: 120,
  display_order: 1,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  choices: [],
};

describe('validateOrderItemOptionsForProduct', () => {
  it('rejects missing required preset group', () => {
    const result = validateOrderItemOptionsForProduct(5, 'Entrecôte', [], [cuissonGroup]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Cuisson');
    }
  });

  it('accepts required preset choice and snapshots labels', () => {
    const result = validateOrderItemOptionsForProduct(
      5,
      'Entrecôte',
      [{ group_id: 1, choice_id: 11 }],
      [cuissonGroup]
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.snapshots).toEqual([
        expect.objectContaining({
          group_name_snapshot: 'Cuisson',
          choice_label_snapshot: 'Bien cuit',
          free_text: null,
        }),
      ]);
    }
  });

  it('accepts optional free text on note group', () => {
    const result = validateOrderItemOptionsForProduct(
      8,
      'Mojito',
      [{ group_id: 2, free_text: 'sans citron' }],
      [noteGroup]
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.snapshots[0]?.free_text).toBe('sans citron');
    }
  });

  it('rejects options on divers lines without product id', () => {
    const result = validateOrderItemOptionsForProduct(
      undefined,
      'Divers',
      [{ group_id: 2, free_text: 'test' }],
      []
    );
    expect(result.ok).toBe(false);
  });

  it('accepts ad-hoc line note without menu assignment', () => {
    const result = validateOrderItemOptionsForProduct(
      8,
      'Mojito',
      [{ group_id: null, free_text: 'sans glacons' }],
      []
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.snapshots).toEqual([
        expect.objectContaining({
          group_id: null,
          group_name_snapshot: 'Note',
          free_text: 'sans glacons',
        }),
      ]);
    }
  });

  it('accepts preset plus ad-hoc line note on the same line', () => {
    const result = validateOrderItemOptionsForProduct(
      5,
      'Entrecôte',
      [
        { group_id: 1, choice_id: 11 },
        { group_id: null, free_text: 'sans sauce' },
      ],
      [cuissonGroup]
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.snapshots).toHaveLength(2);
      expect(result.value.snapshots[1]?.free_text).toBe('sans sauce');
    }
  });
});
