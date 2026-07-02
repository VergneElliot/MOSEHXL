import { usePOSCatalogLogic } from './usePOSCatalogLogic';
import { usePOSOrderTotals } from './usePOSOrderTotals';
import type { OrderItem, Product, Category } from '../types';

export type { POSCatalogLogic } from './usePOSCatalogLogic';
export type { POSOrderTotals } from './usePOSOrderTotals';

export interface POSLogic {
  filteredProducts: Product[];
  orderTotal: number;
  orderTax: number;
  orderSubtotal: number;
  canProcessPayment: boolean;
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
  const catalog = usePOSCatalogLogic(
    products,
    categories,
    selectedCategory,
    searchQuery,
    isHappyHourActive
  );
  const totals = usePOSOrderTotals(currentOrder);

  const calculateItemTotal = (item: OrderItem): number => item.unitPrice * item.quantity;

  return {
    filteredProducts: catalog.filteredProducts,
    orderTotal: totals.orderTotal,
    orderTax: totals.orderTax,
    orderSubtotal: totals.orderSubtotal,
    canProcessPayment: totals.canProcessPayment,
    calculateProductPrice: catalog.calculateProductPrice,
    calculateItemTotal,
    formatCurrency: catalog.formatCurrency,
  };
};
