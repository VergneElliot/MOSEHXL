import { describe, expect, it } from 'vitest';

import { consolidateKitchenTicketLinesForPrint, groupKitchenTicketLinesByPrinter } from './kitchenTicketGrouping';

describe('kitchenTicketGrouping', () => {
  it('groups lines by printer snapshot and duplicates multi-printer products', () => {
    const groups = groupKitchenTicketLinesByPrinter([
      {
        product_name: 'Mojito',
        quantity: 2,
        kitchen_printer_ids_snapshot: [{ id: 1, name: 'Bar', slug: 'bar' }],
        options: [{ id: 1, order_item_id: 10, establishment_id: 'est', group_id: 1, group_name_snapshot: 'Note', choice_id: null, choice_label_snapshot: null, free_text: 'sans citron', display_order: 0, created_at: new Date() }],
      },
      {
        product_name: 'Entrecote',
        quantity: 1,
        kitchen_printer_ids_snapshot: [
          { id: 2, name: 'Cuisine', slug: 'cuisine' },
          { id: 1, name: 'Bar', slug: 'bar' },
        ],
        options: [{ id: 2, order_item_id: 11, establishment_id: 'est', group_id: 2, group_name_snapshot: 'Cuisson', choice_id: 3, choice_label_snapshot: 'Bien cuit', free_text: null, display_order: 0, created_at: new Date() }],
      },
      {
        product_name: 'Cafe',
        quantity: 1,
        kitchen_printer_ids_snapshot: [],
      },
    ]);

    expect(groups).toHaveLength(2);
    const bar = groups.find((group) => group.printer.slug === 'bar');
    const cuisine = groups.find((group) => group.printer.slug === 'cuisine');
    expect(bar?.lines).toHaveLength(2);
    expect(cuisine?.lines).toHaveLength(1);
    expect(bar?.lines[0]?.options[0]?.free_text).toBe('sans citron');
  });

  it('consolidates identical products for kitchen print output', () => {
    const consolidated = consolidateKitchenTicketLinesForPrint([
      { quantity: 1, product_name: 'Tartine', options: [] },
      { quantity: 1, product_name: 'Tartine', options: [] },
      { quantity: 1, product_name: 'Tartine', options: [] },
    ]);

    expect(consolidated).toHaveLength(1);
    expect(consolidated[0]).toMatchObject({ quantity: 3, product_name: 'Tartine', options: [] });
    expect(consolidated[0]?.option_variants).toBeUndefined();
  });

  it('keeps option breakdowns when the same product has different modifiers', () => {
    const consolidated = consolidateKitchenTicketLinesForPrint([
      {
        quantity: 1,
        product_name: 'Tartine',
        options: [{ group_name: 'Cuisson', choice_label: 'Bien cuit' }],
      },
      {
        quantity: 2,
        product_name: 'Tartine',
        options: [{ group_name: 'Cuisson', choice_label: 'A point' }],
      },
    ]);

    expect(consolidated).toHaveLength(1);
    expect(consolidated[0]).toMatchObject({ quantity: 3, product_name: 'Tartine', options: [] });
    expect(consolidated[0]?.option_variants).toEqual([
      { quantity: 1, options: [{ group_name: 'Cuisson', choice_label: 'Bien cuit' }] },
      { quantity: 2, options: [{ group_name: 'Cuisson', choice_label: 'A point' }] },
    ]);
  });
});
