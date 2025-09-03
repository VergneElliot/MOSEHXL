/**
 * Payment Settings Management
 * Handles payment method configuration and validation
 */

import { useCallback } from 'react';
import { PaymentSettings } from '../types';

const defaultPaymentSettings: PaymentSettings = {
  acceptCash: true,
  acceptCard: true,
  acceptChecks: false,
  taxRate: 20,
  discountEnabled: true,
  maxDiscountPercent: 15,
};

interface UsePaymentSettingsProps {
  paymentSettings: PaymentSettings;
  onUpdate: (settings: PaymentSettings) => void;
  onLoadingChange: (loading: boolean) => void;
  onSavingChange: (saving: boolean) => void;
}

export const usePaymentSettings = ({ 
  paymentSettings, 
  onUpdate, 
  onLoadingChange, 
  onSavingChange 
}: UsePaymentSettingsProps) => {

  /**
   * Load payment settings from API
   */
  const loadPaymentSettings = useCallback(async () => {
    onLoadingChange(true);
    try {
      // TODO: Implement when API endpoint is available
      // const response = await apiService.get<PaymentSettings>('/settings/payment');
      // onUpdate({ ...defaultPaymentSettings, ...response });
      console.log('Payment settings loaded (placeholder)');
      onUpdate(defaultPaymentSettings);
    } catch (error) {
      console.error('Error loading payment settings:', error);
      onUpdate(defaultPaymentSettings);
    } finally {
      onLoadingChange(false);
    }
  }, [onUpdate, onLoadingChange]);

  /**
   * Update payment settings
   */
  const updatePaymentSettings = useCallback((updates: Partial<PaymentSettings>) => {
    onUpdate({ ...paymentSettings, ...updates });
  }, [paymentSettings, onUpdate]);

  /**
   * Validate payment settings
   */
  const validatePaymentSettings = useCallback((settings: PaymentSettings): string[] => {
    const errors: string[] = [];
    
    // At least one payment method must be enabled
    if (!settings.acceptCash && !settings.acceptCard && !settings.acceptChecks) {
      errors.push('At least one payment method must be enabled');
    }
    
    // Validate tax rate
    if (settings.taxRate < 0 || settings.taxRate > 100) {
      errors.push('Tax rate must be between 0% and 100%');
    }
    
    // Validate discount percentage
    if (settings.discountEnabled && (settings.maxDiscountPercent < 0 || settings.maxDiscountPercent > 100)) {
      errors.push('Maximum discount percentage must be between 0% and 100%');
    }
    
    return errors;
  }, []);

  /**
   * Save payment settings
   */
  const savePaymentSettings = useCallback(async (): Promise<void> => {
    const errors = validatePaymentSettings(paymentSettings);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    onSavingChange(true);
    try {
      // TODO: Implement API call for payment settings
      // await apiService.post('/settings/payment', paymentSettings);
      console.log('Payment settings saved:', paymentSettings);
    } catch (error) {
      console.error('Error saving payment settings:', error);
      throw error;
    } finally {
      onSavingChange(false);
    }
  }, [paymentSettings, validatePaymentSettings, onSavingChange]);

  /**
   * Reset to defaults
   */
  const resetToDefaults = useCallback(() => {
    onUpdate(defaultPaymentSettings);
  }, [onUpdate]);

  /**
   * Toggle payment method
   */
  const togglePaymentMethod = useCallback((method: 'acceptCash' | 'acceptCard' | 'acceptChecks') => {
    const newSettings = { ...paymentSettings, [method]: !paymentSettings[method] };
    
    // Ensure at least one method remains enabled
    if (!newSettings.acceptCash && !newSettings.acceptCard && !newSettings.acceptChecks) {
      throw new Error('Cannot disable all payment methods');
    }
    
    onUpdate(newSettings);
  }, [paymentSettings, onUpdate]);

  /**
   * Get enabled payment methods
   */
  const getEnabledMethods = useCallback((): string[] => {
    const methods: string[] = [];
    if (paymentSettings.acceptCash) methods.push('Cash');
    if (paymentSettings.acceptCard) methods.push('Card');
    if (paymentSettings.acceptChecks) methods.push('Checks');
    return methods;
  }, [paymentSettings]);

  /**
   * Toggle discount functionality
   */
  const toggleDiscount = useCallback(() => {
    onUpdate({ ...paymentSettings, discountEnabled: !paymentSettings.discountEnabled });
  }, [paymentSettings, onUpdate]);

  return {
    paymentSettings,
    loadPaymentSettings,
    updatePaymentSettings,
    validatePaymentSettings,
    savePaymentSettings,
    resetToDefaults,
    togglePaymentMethod,
    toggleDiscount,
    getEnabledMethods,
    defaultSettings: defaultPaymentSettings,
  };
};
