import { useMemo } from 'react';
import { OrderItem, Product, Category } from '../types';
import { formatCurrency } from '../utils/formatCurrency';
import { HappyHourService } from '../services/happyHourService';

// Function to normalize accents for search
const normalizeAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

export interface POSLogic {
  // Filtered data
  filteredProducts: Product[];

  // Calculations
  orderTotal: number;
  orderTax: number;
  orderSubtotal: number;

  // Validations
  canProcessPayment: boolean;

  // Utilities
  calculateProductPrice: (product: Product, isHappyHour: boolean) => number;
  calculateItemTotal: (item: OrderItem) => number;
  formatCurrency: (amount: number) => string;
}

export const usePOSLogic = (
  products: Product[],
  categories: Category[],
  currentOrder: OrderItem[],
  selectedCategory: string,
  searchQuery: string,
  isHappyHourActive: boolean
): POSLogic => {
  // Filter products based on category and search
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => product.isActive);

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(product => product.categoryId?.toString() === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const normalizedQuery = normalizeAccents(searchQuery.trim());
      filtered = filtered.filter(product =>
        normalizeAccents(product.name).includes(normalizedQuery)
      );
    }

    return filtered;
  }, [products, selectedCategory, searchQuery]);

  // Calculate product price with happy hour discounts.
  // If the product has an individual discount (value > 0), use it; otherwise use the base discount from Parameters.
  const calculateProductPrice = (product: Product, isHappyHour: boolean): number => {
    if (!isHappyHour || !product.isHappyHourEligible) {
      return product.price;
    }

    const baseSettings = HappyHourService.getInstance().getSettings();
    const productVal = product.happyHourDiscountValue;
    const productValNum =
      typeof productVal === 'number'
        ? productVal
        : (Number.isNaN(Number(productVal)) ? 0 : Number(productVal));
    const hasIndividualDiscount = productValNum > 0;
    const type: 'percentage' | 'fixed' = hasIndividualDiscount
      ? (product.happyHourDiscountType ?? 'percentage')
      : (baseSettings.discountType ?? 'percentage');
    // Coerce to number: form/store may have saved discountValue as string (e.g. "1" for 1€)
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

    // Base percentage may be stored as 20 (form) or 0.2 (decimal)
    if (type === 'percentage' && value > 1) {
      value = value / 100;
    }

    if (type === 'percentage') {
      return product.price * (1 - value);
    }
    return Math.max(0, product.price - value);
  };

  // Calculate item total (price * quantity)
  const calculateItemTotal = (item: OrderItem): number => {
    return item.unitPrice * item.quantity;
  };

  // Calculate order totals
  const orderSubtotal = useMemo(() => {
    return currentOrder.reduce((total, item) => total + calculateItemTotal(item), 0);
  }, [currentOrder]);

  const orderTax = useMemo(() => {
    return currentOrder.reduce((total, item) => total + item.taxAmount, 0);
  }, [currentOrder]);

  // France: prices are TTC (all tax included). orderSubtotal is the sum of line totals (TTC).
  // orderTax is the tax component for display/legal breakdown only — do not add it on top.
  const orderTotal = useMemo(() => {
    return orderSubtotal;
  }, [orderSubtotal]);

  // Validation logic
  // Allow processing orders even when total is 0 (e.g. Offert/Perso or full discounts)
  const canProcessPayment = useMemo(() => {
    return currentOrder.length > 0 && orderTotal >= 0;
  }, [currentOrder.length, orderTotal]);

  return {
    filteredProducts,
    orderTotal,
    orderTax,
    orderSubtotal,
    canProcessPayment,
    calculateProductPrice,
    calculateItemTotal,
    formatCurrency,
  };
};
