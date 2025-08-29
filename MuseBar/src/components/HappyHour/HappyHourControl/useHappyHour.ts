/**
 * Happy Hour State Management Hook
 * Centralized state management and business logic for happy hour functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { HappyHourService } from '../../../services/happyHourService';
import { DataService } from '../../../services/dataService';
import { Product } from '../../../types';
import {
  HappyHourState,
  UseHappyHourReturn,
  HappyHourSettings,
  EditForm,
} from './types';

/**
 * Default happy hour settings
 */
const defaultSettings: HappyHourSettings = {
  startTime: '16:00',
  endTime: '18:00',
  discountType: 'percentage',
  discountValue: 20,
  isEnabled: false,
};

const defaultEditForm: EditForm = {
  type: 'percentage',
  value: '0',
};

/**
 * Happy Hour Hook
 */
export const useHappyHour = (
  onStatusUpdate: () => void
): UseHappyHourReturn => {
  const [state, setState] = useState<HappyHourState>({
    settings: defaultSettings,
    eligibleProducts: [],
    editingProductId: null,
    editForm: defaultEditForm,
    loading: false,
  });

  const happyHourService = HappyHourService.getInstance();
  const dataService = DataService.getInstance();

  /**
   * Load initial data
   */
  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Load settings and eligible products
   */
  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      // Load settings
      const settings = await happyHourService.getSettings();
      
      // Load eligible products
      const allProducts = await dataService.getProducts();
      const eligibleProducts = allProducts.filter(
        (product: Product) => product.isHappyHourEligible && product.isActive
      );

      setState(prev => ({
        ...prev,
        settings: {
          startTime: settings.startTime || defaultSettings.startTime,
          endTime: settings.endTime || defaultSettings.endTime,
          discountType: settings.discountType || defaultSettings.discountType,
          discountValue: settings.discountValue || defaultSettings.discountValue,
          isEnabled: settings.isEnabled || defaultSettings.isEnabled,
        },
        eligibleProducts,
      }));
    } catch (error) {
      console.error('Error loading happy hour data:', error);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  /**
   * Update settings state
   */
  const updateSettings = useCallback((settings: HappyHourSettings) => {
    setState(prev => ({ ...prev, settings }));
  }, []);

  /**
   * Save settings to backend
   */
  const saveSettings = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      await happyHourService.updateSettings({
        startTime: state.settings.startTime,
        endTime: state.settings.endTime,
        discountType: state.settings.discountType,
        discountValue:
          state.settings.discountType === 'fixed'
            ? parseFloat(state.settings.discountValue.toString())
            : parseFloat(state.settings.discountValue.toString()) / 100,
        isEnabled: state.settings.isEnabled,
      });
      
      onStatusUpdate();
    } catch (error) {
      console.error('Error saving happy hour settings:', error);
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.settings, onStatusUpdate]);

  /**
   * Start editing a product
   */
  const startEditingProduct = useCallback((productId: string) => {
    const product = state.eligibleProducts.find(p => p.id === productId);
    if (!product) return;

    const priceInfo = calculateHappyHourPrice(product);
    const { value } = priceInfo;
    
    setState(prev => ({
      ...prev,
      editingProductId: productId,
      editForm: {
        type: product.happyHourDiscountType || 'percentage',
        value:
          product.happyHourDiscountType === 'fixed'
            ? value.toFixed(2)
            : (value * 100).toFixed(0),
      },
    }));
  }, [state.eligibleProducts]);

  /**
   * Update edit form
   */
  const updateEditForm = useCallback((form: EditForm) => {
    setState(prev => ({ ...prev, editForm: form }));
  }, []);

  /**
   * Save product discount
   */
  const saveProductDiscount = useCallback(async (productId: string) => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const discountValue = parseFloat(state.editForm.value);
      const finalValue = state.editForm.type === 'percentage' ? discountValue / 100 : discountValue;

      await dataService.updateProduct(productId, {
        happyHourDiscountType: state.editForm.type,
        happyHourDiscountValue: finalValue,
      });

      // Refresh eligible products
      const allProducts = await dataService.getProducts();
      const eligibleProducts = allProducts.filter(
        (product: Product) => product.isHappyHourEligible && product.isActive
      );

      setState(prev => ({
        ...prev,
        eligibleProducts,
        editingProductId: null,
        editForm: defaultEditForm,
      }));
      
      onStatusUpdate();
    } catch (error) {
      console.error('Error saving product discount:', error);
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.editForm, onStatusUpdate]);

  /**
   * Cancel editing
   */
  const cancelEditing = useCallback(() => {
    setState(prev => ({
      ...prev,
      editingProductId: null,
      editForm: defaultEditForm,
    }));
  }, []);

  /**
   * Toggle manual active state
   */
  const toggleManualActive = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      await happyHourService.toggleManualActivation();
      onStatusUpdate();
    } catch (error) {
      console.error('Error toggling manual active:', error);
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [onStatusUpdate]);

  /**
   * Get current time formatted
   */
  const getCurrentTime = useCallback(() => {
    return new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  /**
   * Format currency
   */
  const formatCurrency = useCallback((amount: number) => {
    return amount.toFixed(2) + '€';
  }, []);

  /**
   * Calculate happy hour price for a product
   */
  const calculateHappyHourPrice = useCallback((product: Product) => {
    const discountType = product.happyHourDiscountType || state.settings.discountType;
    const discountValue = product.happyHourDiscountValue || 
      (state.settings.discountType === 'percentage' 
        ? state.settings.discountValue / 100 
        : state.settings.discountValue);

    let happyHourPrice: number;
    
    if (discountType === 'percentage') {
      happyHourPrice = product.price * (1 - discountValue);
    } else {
      happyHourPrice = Math.max(0, product.price - discountValue);
    }

    return {
      price: happyHourPrice,
      value: discountValue,
      type: discountType,
    };
  }, [state.settings]);

  /**
   * Get discount label for a product
   */
  const getDiscountLabel = useCallback((product: Product) => {
    const { value, type } = calculateHappyHourPrice(product);
    
    if (type === 'percentage') {
      return `-${(value * 100).toFixed(0)}%`;
    } else {
      return `-${value.toFixed(2)}€`;
    }
  }, [calculateHappyHourPrice]);

  return {
    state,
    updateSettings,
    saveSettings,
    startEditingProduct,
    updateEditForm,
    saveProductDiscount,
    cancelEditing,
    toggleManualActive,
    getCurrentTime,
    formatCurrency,
    calculateHappyHourPrice,
    getDiscountLabel,
  };
};

