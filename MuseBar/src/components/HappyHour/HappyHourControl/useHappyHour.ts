/**
 * Happy Hour State Management Hook
 * Centralized state management and business logic for happy hour functionality
 * 
 * @deprecated Use individual modules from './hooks/' instead for better modularity
 * This file is maintained for backward compatibility
 */

import { useEffect, useCallback } from 'react';
import { UseHappyHourReturn, EditForm } from './types';
import { HappyHourService } from '../../../services/happyHourService';
import { useHappyHourState, useHappyHourSettings, useHappyHourProducts } from './hooks';
import { formatCurrency } from '../../../utils/formatCurrency';

import { Product } from '../../../types';

export const useHappyHourControl = (
  onStatusUpdate: () => void,
  products: Product[] = []
): UseHappyHourReturn => {
  const { state, setState, loadData } = useHappyHourState(products);
  
  const settingsHook = useHappyHourSettings({
    onSettingsUpdate: (settings) => {
      setState(prev => ({ ...prev, settings }));
    },
    onStatusUpdate,
  });

  const productsHook = useHappyHourProducts({
    onProductUpdate: () => {
      loadData(); // Reload data when products are updated
    },
  });

  /**
   * Load initial data
   */
  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Start editing a product
   */
  const startEditingProduct = useCallback((productId: string) => {
    const product = state.eligibleProducts.find(p => p.id === productId);
    if (product) {
      const discount = productsHook.getEffectiveDiscount(product, state.settings);
      setState(prev => ({
        ...prev,
        editingProductId: productId,
        editForm: {
          type: discount.type,
          value: discount.value.toString(),
        },
      }));
    }
  }, [state.eligibleProducts, state.settings, productsHook, setState]);

  /**
   * Cancel editing
   */
  const cancelEditing = useCallback(() => {
    setState(prev => ({
      ...prev,
      editingProductId: null,
      editForm: { type: 'percentage', value: '0' },
    }));
  }, [setState]);

  /**
   * Save product discount
   */
  const saveProductDiscount = useCallback(async (productId: string) => {
    const { editForm } = state;
    const discountValue = parseFloat(editForm.value);
    
    if (isNaN(discountValue) || discountValue < 0) {
      throw new Error('Invalid discount value');
    }

    await productsHook.updateProductDiscount(
      productId,
      editForm.type,
      discountValue
    );
    
    cancelEditing();
  }, [state, productsHook, cancelEditing]);

  /**
   * Update edit form
   */
  const updateEditForm = useCallback((form: EditForm) => {
    setState(prev => ({
      ...prev,
      editForm: form,
    }));
  }, [setState]);

  return {
    // State
    state,

    // Update local form state only — no API call on every keystroke
    updateSettings: async (settings) => {
      setState(prev => ({ ...prev, settings }));
    },

    // Persist to API only when the user explicitly clicks Save
    saveSettings: async () => {
      await settingsHook.updateSettings(state.settings);
      onStatusUpdate();
    },

    // Product management
    startEditingProduct,
    updateEditForm,
    saveProductDiscount,
    cancelEditing,

    // Manual control: persist in service and notify App to refresh status
    toggleManualActive: async () => {
      HappyHourService.getInstance().toggleManualActivation();
      onStatusUpdate();
    },
    
    // Utility functions
    getCurrentTime: () => new Date().toLocaleTimeString(),
    formatCurrency,
    calculateHappyHourPrice: (product) => {
      const discount = productsHook.getEffectiveDiscount(product, state.settings);
      const discountedPrice = productsHook.calculateHappyHourPrice(product.price, discount.type, discount.value);
      return {
        price: discountedPrice,
        value: discount.value,
        type: discount.type,
      };
    },
    getDiscountLabel: (product) => {
      const discount = productsHook.getEffectiveDiscount(product, state.settings);
      return discount.type === 'percentage' ? `${discount.value}%` : formatCurrency(discount.value);
    },
  };
};