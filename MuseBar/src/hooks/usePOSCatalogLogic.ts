import { useCallback, useMemo } from 'react';
import { Product, Category } from '../types';
import { formatCurrency } from '../utils/formatCurrency';
import { HappyHourService } from '../services/happyHourService';

const normalizeAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

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
  isHappyHourActive: boolean
): POSCatalogLogic => {
  void categories;
  void isHappyHourActive;

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => product.isActive);

    if (searchQuery.trim()) {
      const normalizedQuery = normalizeAccents(searchQuery.trim());
      filtered = filtered.filter(product =>
        normalizeAccents(product.name).includes(normalizedQuery)
      );
      return filtered;
    }

    if (selectedCategory) {
      filtered = filtered.filter(product => product.categoryId?.toString() === selectedCategory);
    }

    return filtered;
  }, [products, selectedCategory, searchQuery]);

  const calculateProductPrice = useCallback((product: Product, isHappyHour: boolean): number => {
    if (!isHappyHour || !product.isHappyHourEligible) {
      return product.price;
    }

    const baseSettings = HappyHourService.getInstance().getSettings();
    const productVal = product.happyHourDiscountValue;
    const productValNum =
      typeof productVal === 'number'
        ? productVal
        : Number.isNaN(Number(productVal))
          ? 0
          : Number(productVal);
    const hasIndividualDiscount = productValNum > 0;
    const type: 'percentage' | 'fixed' = hasIndividualDiscount
      ? (product.happyHourDiscountType ?? 'percentage')
      : (baseSettings.discountType ?? 'percentage');
    let value: number;
    if (hasIndividualDiscount) {
      value = productValNum;
    } else {
      const raw = baseSettings.discountValue;
      if (typeof raw === 'number' && !Number.isNaN(raw)) {
        value = raw;
      } else {
        const n = Number(raw);
        value = Number.isNaN(n) ? 0 : n;
      }
    }

    if (type === 'percentage' && value > 1) {
      value = value / 100;
    }

    if (type === 'percentage') {
      return product.price * (1 - value);
    }
    return Math.max(0, product.price - value);
  }, []);

  return {
    filteredProducts,
    calculateProductPrice,
    formatCurrency,
  };
};
