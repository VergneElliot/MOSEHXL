import { useMemo } from 'react';
import { OrderItem, Product, Category } from '../types';
import { HappyHourService } from '../services/happyHourService';

// Function to normalize accents for search
const normalizeAccents = (str: string): string => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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
      filtered = filtered.filter(product => 
        product.categoryId?.toString() === selectedCategory
      );
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

  // Calculate product price with happy hour discounts
  const calculateProductPrice = (product: Product, isHappyHour: boolean): number => {
    if (!isHappyHour || !product.isHappyHourEligible) {
      return product.price;
    }
    
    // Apply happy hour discount based on product settings
    if (product.happyHourDiscountType === 'percentage') {
      return product.price * (1 - product.happyHourDiscountValue);
    } else {
      return Math.max(0, product.price - product.happyHourDiscountValue);
    }
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

  const orderTotal = useMemo(() => {
    return orderSubtotal + orderTax;
  }, [orderSubtotal, orderTax]);

  // Validation logic
  const canProcessPayment = useMemo(() => {
    return currentOrder.length > 0 && orderTotal > 0;
  }, [currentOrder.length, orderTotal]);

  // Utility functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

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