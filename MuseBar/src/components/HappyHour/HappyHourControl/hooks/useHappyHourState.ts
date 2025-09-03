/**
 * Happy Hour State Management
 * Core state management and data loading for happy hour functionality
 */

import { useState, useCallback } from 'react';
import { HappyHourService } from '../../../../services/happyHourService';
import { DataService } from '../../../../services/dataService';
import { Product } from '../../../../types';
import { HappyHourState, HappyHourSettings, EditForm } from '../types';

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

interface UseHappyHourStateReturn {
  state: HappyHourState;
  setState: React.Dispatch<React.SetStateAction<HappyHourState>>;
  loadData: () => Promise<void>;
  resetState: () => void;
}

export const useHappyHourState = (): UseHappyHourStateReturn => {
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
        loading: false,
      }));
    } catch (error) {
      console.error('Failed to load happy hour data:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [happyHourService, dataService]);

  /**
   * Reset state to defaults
   */
  const resetState = useCallback(() => {
    setState({
      settings: defaultSettings,
      eligibleProducts: [],
      editingProductId: null,
      editForm: defaultEditForm,
      loading: false,
    });
  }, []);

  return {
    state,
    setState,
    loadData,
    resetState,
  };
};
