import { describe, expect, it } from 'vitest';

import { groupReceiptLineItemsForPrint } from './printLineGrouping';

describe('groupReceiptLineItemsForPrint', () => {
  it('merges identical lines and sums quantity and total_price', () => {
    const grouped = groupReceiptLineItemsForPrint([
      {
        product_name: 'Tartine',
        quantity: 1,
        unit_price: 8.5,
        total_price: 8.5,
        tax_rate: 10,
      },
      {
        product_name: 'Tartine',
        quantity: 1,
        unit_price: 8.5,
        total_price: 8.5,
        tax_rate: 10,
      },
      {
        product_name: 'Tartine',
        quantity: 1,
        unit_price: 8.5,
        total_price: 8.5,
        tax_rate: 10,
      },
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({
      product_name: 'Tartine',
      quantity: 3,
      unit_price: 8.5,
      total_price: 25.5,
      tax_rate: 10,
    });
  });

  it('keeps separate lines when unit price or tax rate differs', () => {
    const grouped = groupReceiptLineItemsForPrint([
      {
        product_name: 'Biere',
        quantity: 1,
        unit_price: 5,
        total_price: 5,
        tax_rate: 20,
      },
      {
        product_name: 'Biere',
        quantity: 1,
        unit_price: 4,
        total_price: 4,
        tax_rate: 20,
      },
    ]);

    expect(grouped).toHaveLength(2);
  });
});
