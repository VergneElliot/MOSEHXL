import { describe, expect, it } from 'vitest';
import type { Product } from '../../types';
import {
  buildOrderItemFromProduct,
  orderItemFromDivers,
  orderItemFromPourboire,
} from './posContainerItems';

function product(partial: Partial<Product> = {}): Product {
  return {
    id: '5',
    name: 'Pint',
    description: '',
    price: 7,
    taxRate: 0.2,
    categoryId: '1',
    isHappyHourEligible: true,
    happyHourDiscountType: 'percentage',
    happyHourDiscountValue: 0.1,
    isActive: true,
    optionGroupIds: [],
    optionGroups: [],
    kitchenPrinterIds: [],
    kitchenPrinters: [],
    printPickupSlip: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...partial,
  };
}

describe('buildOrderItemFromProduct', () => {
  it('builds a line with tax, options, and happy-hour flag', () => {
    const item = buildOrderItemFromProduct(
      product(),
      [
        {
          groupId: 'g1',
          groupName: 'Size',
          choiceId: 'c1',
          choiceLabel: 'Pinte',
          displayOrder: 1,
        },
      ],
      true,
      (p, hh) => (hh ? 6 : p.price)
    );
    expect(item.productId).toBe('5');
    expect(item.unitPrice).toBe(6);
    expect(item.totalPrice).toBe(6);
    expect(item.isHappyHourApplied).toBe(true);
    expect(item.originalPrice).toBe(7);
    expect(item.taxAmount).toBeCloseTo(6 * (0.2 / 1.2), 10);
    expect(item.options?.[0]).toMatchObject({
      groupId: 'g1',
      choiceLabel: 'Pinte',
    });
  });

  it('does not mark happy hour when the product is ineligible', () => {
    const item = buildOrderItemFromProduct(
      product({ isHappyHourEligible: false }),
      [],
      true,
      (p) => p.price
    );
    expect(item.isHappyHourApplied).toBe(false);
  });
});

describe('orderItemFromDivers', () => {
  it('parses comma decimals and rejects invalid prices', () => {
    const ok = orderItemFromDivers({
      description: '  Divers note  ',
      price: '12,50',
      taxRate: 0.1,
    });
    expect(ok).toMatchObject({
      productId: null,
      productName: 'Divers note',
      unitPrice: 12.5,
      description: 'Divers note',
    });
    expect(ok?.taxAmount).toBeCloseTo(12.5 * (0.1 / 1.1), 10);

    expect(orderItemFromDivers({ description: 'x', price: 'nope', taxRate: 0.2 })).toBeNull();
    expect(orderItemFromDivers({ description: 'x', price: '-1', taxRate: 0.2 })).toBeNull();
  });
});

describe('orderItemFromPourboire', () => {
  it('builds a tip line and rejects non-positive amounts', () => {
    const tip = orderItemFromPourboire({ amount: '3,5' });
    expect(tip).toMatchObject({
      isTip: true,
      unitPrice: 3.5,
      taxRate: 0,
      productName: 'Pourboire (carte)',
    });
    expect(orderItemFromPourboire({ amount: '0' })).toBeNull();
    expect(orderItemFromPourboire({ amount: 'abc' })).toBeNull();
  });
});
