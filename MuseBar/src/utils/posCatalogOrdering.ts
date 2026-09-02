import type { Category, Product } from '../types';

/** Pseudo-category id for POS « Favoris » chip (not a DB category). */
export const FAVORITES_CATEGORY_ID = '__favoris__';

const collator = new Intl.Collator('fr', { sensitivity: 'base' });

export function compareProductNames(a: Product, b: Product): number {
  return collator.compare(a.name, b.name);
}

export function compareCategoryNames(a: Category, b: Category): number {
  return collator.compare(a.name, b.name);
}

function resolveTopSellerProducts(
  activeProducts: Product[],
  topSellerProductIds: string[]
): Product[] {
  const byId = new Map(activeProducts.map((p) => [String(p.id), p]));
  const seen = new Set<string>();
  const favorites: Product[] = [];
  for (const id of topSellerProductIds) {
    const key = String(id);
    if (seen.has(key)) continue;
    const product = byId.get(key);
    if (product) {
      seen.add(key);
      favorites.push(product);
    }
  }
  return favorites;
}

/** Tous: top sellers (popularity), then each category A→Z with products A→Z (favorites duplicated). */
export function orderProductsForTousView(
  products: Product[],
  categories: Category[],
  topSellerProductIds: string[]
): Product[] {
  const active = products.filter((p) => p.isActive);
  const favorites = resolveTopSellerProducts(active, topSellerProductIds);

  const sortedCategories = categories.filter((c) => c.isActive).sort(compareCategoryNames);
  const knownCategoryIds = new Set(sortedCategories.map((c) => String(c.id)));

  const byCategory: Product[] = [];
  for (const cat of sortedCategories) {
    const catId = String(cat.id);
    byCategory.push(
      ...active.filter((p) => String(p.categoryId) === catId).sort(compareProductNames)
    );
  }
  const uncategorized = active
    .filter((p) => !p.categoryId || !knownCategoryIds.has(String(p.categoryId)))
    .sort(compareProductNames);

  return [...favorites, ...byCategory, ...uncategorized];
}

export function orderProductsForFavoritesView(
  products: Product[],
  topSellerProductIds: string[]
): Product[] {
  const active = products.filter((p) => p.isActive);
  return resolveTopSellerProducts(active, topSellerProductIds);
}

export function orderProductsForCategoryView(products: Product[], categoryId: string): Product[] {
  return products
    .filter((p) => p.isActive && String(p.categoryId) === String(categoryId))
    .sort(compareProductNames);
}

export function filterProductsBySearch(products: Product[], searchQuery: string): Product[] {
  const normalizedQuery = searchQuery
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (!normalizedQuery) return products;
  return products.filter((product) => {
    const name = product.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return name.includes(normalizedQuery);
  });
}
