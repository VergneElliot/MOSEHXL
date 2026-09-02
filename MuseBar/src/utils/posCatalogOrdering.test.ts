import { describe, expect, it } from 'vitest';
import {
  FAVORITES_CATEGORY_ID,
  orderProductsForCategoryView,
  orderProductsForFavoritesView,
  orderProductsForTousView,
} from './posCatalogOrdering';
import type { Category, Product } from '../types';

function product(id: string, name: string, categoryId: string): Product {
  return {
    id,
    name,
    price: 5,
    taxRate: 0.2,
    categoryId,
    isHappyHourEligible: false,
    happyHourDiscountType: 'percentage',
    happyHourDiscountValue: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const categories: Category[] = [
  { id: '2', name: 'Bières', isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { id: '1', name: 'Apéritifs', isActive: true, createdAt: new Date(), updatedAt: new Date() },
];

const products = [
  product('10', 'Zebra Beer', '2'),
  product('11', 'Alpha Beer', '2'),
  product('20', 'Cognac', '1'),
  product('21', 'Amaretto', '1'),
];

describe('posCatalogOrdering', () => {
  it('FAVORITES_CATEGORY_ID is stable', () => {
    expect(FAVORITES_CATEGORY_ID).toBe('__favoris__');
  });

  it('orders Tous: favorites first, then categories A→Z with products A→Z (duplicates kept)', () => {
    const topIds = ['10', '21'];
    const ordered = orderProductsForTousView(products, categories, topIds);
    expect(ordered.map((p) => p.id)).toEqual(['10', '21', '21', '20', '11', '10']);
  });

  it('Favoris view keeps popularity order', () => {
    const ordered = orderProductsForFavoritesView(products, ['21', '10']);
    expect(ordered.map((p) => p.id)).toEqual(['21', '10']);
  });

  it('category view sorts products alphabetically', () => {
    const ordered = orderProductsForCategoryView(products, '2');
    expect(ordered.map((p) => p.name)).toEqual(['Alpha Beer', 'Zebra Beer']);
  });
});
