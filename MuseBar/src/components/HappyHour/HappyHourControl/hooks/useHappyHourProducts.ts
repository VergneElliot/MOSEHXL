/**
 * Happy Hour Product Management
 * Handles product-specific happy hour operations and calculations
 */

import { useCallback } from 'react';
import { Product } from '../../../../types';
import { HappyHourSettings } from '../types';

interface UseHappyHourProductsProps {
  onProductUpdate: () => void;
}

export const useHappyHourProducts = ({ onProductUpdate }: UseHappyHourProductsProps) => {

  /**
   * Calculate happy hour price for a product
   */
  const calculateHappyHourPrice = useCallback((
    originalPrice: number,
    discountType: 'percentage' | 'fixed',
    discountValue: number
  ): number => {
    if (discountType === 'percentage') {
      return originalPrice * (1 - discountValue / 100);
    } else {
      return Math.max(0, originalPrice - discountValue);
    }
  }, []);

  /**
   * Update product-specific happy hour discount
   * Note: This would need to be implemented in the actual data service
   */
  const updateProductDiscount = useCallback(async (
    _productId: string,
    _discountType: 'percentage' | 'fixed',
    _discountValue: number
  ) => {
    throw new Error('Product-specific discount updates not yet implemented');
  }, []);

  /**
   * Remove product-specific happy hour discount
   * Note: This would need to be implemented in the actual data service
   */
  const removeProductDiscount = useCallback(async (_productId: string) => {
    throw new Error('Product-specific discount removal not yet implemented');
  }, []);

  /**
   * Toggle product happy hour eligibility
   * Note: This would need to be implemented in the actual data service
   */
  const toggleProductEligibility = useCallback(async (
    _productId: string,
    _isEligible: boolean
  ) => {
    throw new Error('Product eligibility toggle not yet implemented');
  }, []);

  /**
   * Get effective discount for a product during happy hour
   */
  const getEffectiveDiscount = useCallback((
    product: Product,
    settings: HappyHourSettings
  ): { type: 'percentage' | 'fixed'; value: number } => {
    // Check if product has custom discount
    if (product.happyHourDiscountType && product.happyHourDiscountValue) {
      return {
        type: product.happyHourDiscountType,
        value: product.happyHourDiscountValue,
      };
    }
    
    // Use global settings
    return {
      type: settings.discountType,
      value: settings.discountValue,
    };
  }, []);

  /**
   * Check if a product is currently eligible for happy hour
   */
  const isProductEligible = useCallback((product: Product): boolean => {
    return product.isHappyHourEligible && product.isActive;
  }, []);

  /**
   * Get happy hour price for a product
   */
  const getHappyHourPrice = useCallback((
    product: Product,
    settings: HappyHourSettings
  ): number => {
    if (!isProductEligible(product)) {
      return product.price;
    }

    const discount = getEffectiveDiscount(product, settings);
    return calculateHappyHourPrice(product.price, discount.type, discount.value);
  }, [isProductEligible, getEffectiveDiscount, calculateHappyHourPrice]);

  return {
    calculateHappyHourPrice,
    updateProductDiscount,
    removeProductDiscount,
    toggleProductEligibility,
    getEffectiveDiscount,
    isProductEligible,
    getHappyHourPrice,
  };
};
