import { useCallback, useMemo } from 'react';
import { calculateHappyHourPrice } from '@mosehxl/types';
import { Product, Category } from '../types';
import { formatCurrency } from '../utils/formatCurrency';
import { HappyHourService } from '../services/happyHourService';
import {
  FAVORITES_CATEGORY_ID,
  filterProductsBySearch,
  orderProductsForCategoryView,
  orderProductsForFavoritesView,
  orderProductsForTousView,
} from '../utils/posCatalogOrdering';

export { FAVORITES_CATEGORY_ID };

export interface POSCatalogLogic {
  filteredProducts: Product[];
  calculateProductPrice: (product: Product, isHappyHour: boolean) => number;
  formatCurrency: (amount: number) => string;
}

/** Menu/catalog logic only — does not depend on cart state. */
export const usePOSCatalogLogic = (
  products: Product[],
  categories: Category[],
  selectedCategory: string,
  searchQuery: string,
  isHappyHourActive: boolean,
  topSellerProductIds: string[] = []
): POSCatalogLogic => {
  void isHappyHourActive;

  const filteredProducts = useMemo(() => {
    let ordered: Product[];

    if (searchQuery.trim()) {
      const active = products.filter((p) => p.isActive);
      ordered = filterProductsBySearch(active, searchQuery);
    } else if (selectedCategory === FAVORITES_CATEGORY_ID) {
      ordered = orderProductsForFavoritesView(products, topSellerProductIds);
    } else if (!selectedCategory) {
      ordered = orderProductsForTousView(products, categories, topSellerProductIds);
    } else {
      ordered = orderProductsForCategoryView(products, selectedCategory);
    }

    return ordered;
  }, [products, categories, selectedCategory, searchQuery, topSellerProductIds]);

  const calculateProductPrice = useCallback((product: Product, isHappyHour: boolean): number => {
    const baseSettings = HappyHourService.getInstance().getSettings();
    return calculateHappyHourPrice(
      {
        price: product.price,
        isHappyHourEligible: product.isHappyHourEligible,
        happyHourDiscountType: product.happyHourDiscountType,
        happyHourDiscountValue: product.happyHourDiscountValue,
      },
      isHappyHour,
      {
        discountType: baseSettings.discountType,
        discountValue: baseSettings.discountValue,
      }
    );
  }, []);

  return {
    filteredProducts,
    calculateProductPrice,
    formatCurrency,
  };
};
