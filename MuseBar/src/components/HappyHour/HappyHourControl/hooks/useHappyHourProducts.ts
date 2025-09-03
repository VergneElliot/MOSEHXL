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
    productId: string,
    discountType: 'percentage' | 'fixed',
    discountValue: number
  ) => {
    try {
      // TODO: Implement product-specific discount updates
      console.log('Update product discount:', { productId, discountType, discountValue });
      onProductUpdate();
    } catch (error) {
      console.error('Failed to update product discount:', error);
      throw error;
    }
  }, [onProductUpdate]);

  /**
   * Remove product-specific happy hour discount
   * Note: This would need to be implemented in the actual data service
   */
  const removeProductDiscount = useCallback(async (productId: string) => {
    try {
      // TODO: Implement product-specific discount removal
      console.log('Remove product discount:', productId);
      onProductUpdate();
    } catch (error) {
      console.error('Failed to remove product discount:', error);
      throw error;
    }
  }, [onProductUpdate]);

  /**
   * Toggle product happy hour eligibility
   * Note: This would need to be implemented in the actual data service
   */
  const toggleProductEligibility = useCallback(async (
    productId: string,
    isEligible: boolean
  ) => {
    try {
      // TODO: Implement product eligibility toggle
      console.log('Toggle product eligibility:', { productId, isEligible });
      onProductUpdate();
    } catch (error) {
      console.error('Failed to toggle product eligibility:', error);
      throw error;
    }
  }, [onProductUpdate]);

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
