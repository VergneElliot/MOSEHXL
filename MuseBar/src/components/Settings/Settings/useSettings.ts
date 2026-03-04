/**
 * Settings State Management Hook
 * Centralized state management for all settings functionality
 * 
 * @deprecated Use individual modules from './hooks/' instead for better modularity
 * This file is maintained for backward compatibility
 */

import { useState, useEffect } from 'react';
import { SettingsState, UseSettingsReturn } from './types';
import { useGeneralSettings, useBusinessInfo, useClosureSettings, usePaymentSettings } from './hooks';

// Extended state for the hook with loading states
interface ExtendedSettingsState extends SettingsState {
  loading: boolean;
  saving: boolean;
}

export const useSettings = (): UseSettingsReturn => {
  const [state, setState] = useState<ExtendedSettingsState>({
    generalSettings: {
      barName: 'MuseBar',
      address: '',
      phone: '',
      email: '',
      taxIdentification: '',
      currency: 'EUR',
      language: 'fr',
    },
    businessInfo: {
      name: '',
      address: '',
      phone: '',
      email: '',
      siret: '',
      taxIdentification: '',
    },
    closureSettings: {
      auto_closure_enabled: true,
      daily_closure_time: '02:00',
      timezone: 'Europe/Paris',
      grace_period_minutes: 30,
    },
    paymentSettings: {
      acceptCash: true,
      acceptCard: true,
      acceptChecks: false,
      taxRate: 20,
      discountEnabled: true,
      maxDiscountPercent: 15,
    },
    printerSettings: {
      enabled: false,
      printerName: '',
      printReceipts: true,
      printReports: false,
    },
    schedulerStatus: {
      is_running: false,
      has_interval: false,
      next_check: '',
    },
    loading: false,
    saving: false,
  });

  // Initialize modular hooks
  const generalHook = useGeneralSettings({
    generalSettings: state.generalSettings,
    onUpdate: (settings) => setState(prev => ({ ...prev, generalSettings: settings })),
    onSave: async () => {
      setState(prev => ({ ...prev, saving: true }));
      try {
        // General settings API not yet implemented -- save is a no-op for now
      } finally {
        setState(prev => ({ ...prev, saving: false }));
      }
    },
  });

  const businessHook = useBusinessInfo({
    businessInfo: state.businessInfo,
    onUpdate: (info) => setState(prev => ({ ...prev, businessInfo: info })),
    onLoadingChange: (loading) => setState(prev => ({ ...prev, loading })),
    onSavingChange: (saving) => setState(prev => ({ ...prev, saving })),
  });

  const closureHook = useClosureSettings({
    closureSettings: state.closureSettings,
    onUpdate: (settings) => setState(prev => ({ ...prev, closureSettings: settings })),
    onLoadingChange: (loading) => setState(prev => ({ ...prev, loading })),
    onSavingChange: (saving) => setState(prev => ({ ...prev, saving })),
  });

  const paymentHook = usePaymentSettings({
    paymentSettings: state.paymentSettings,
    onUpdate: (settings) => setState(prev => ({ ...prev, paymentSettings: settings })),
    onLoadingChange: (loading) => setState(prev => ({ ...prev, loading })),
    onSavingChange: (saving) => setState(prev => ({ ...prev, saving })),
  });

  /**
   * Load all settings on component mount
   */
  useEffect(() => {
    loadAllSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Load all settings from API
   */
  const loadAllSettings = async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      await Promise.all([
        businessHook.loadBusinessInfo(),
        closureHook.loadClosureSettings(),
        paymentHook.loadPaymentSettings(),
      ]);
    } catch (error) {
      // Error loading settings
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  /**
   * Test printer connection
   */
  const testPrinter = async (): Promise<void> => {
    setState(prev => ({ ...prev, saving: true }));
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // TODO: Replace with real printer test API
    } catch (error) {
      throw error;
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  return {
    // State and core properties
    state: {
      generalSettings: state.generalSettings,
      businessInfo: state.businessInfo,
      closureSettings: state.closureSettings,
      paymentSettings: state.paymentSettings,
      printerSettings: state.printerSettings,
      schedulerStatus: state.schedulerStatus,
    },
    loading: state.loading,
    saving: state.saving,
    infoSaving: state.saving, // Use same saving state for info
    infoMessage: null, // TODO: Implement info messages
    
    // Settings update functions
    updateGeneralSettings: generalHook.updateGeneralSettings,
    updateBusinessInfo: businessHook.updateBusinessInfo,
    updateClosureSettings: closureHook.updateClosureSettings,
    updatePaymentSettings: paymentHook.updatePaymentSettings,
    
    // Save functions
    saveGeneralSettings: generalHook.saveWithValidation,
    saveBusinessInfo: businessHook.saveBusinessInfo,
    saveClosureSettings: closureHook.saveClosureSettings,
    savePaymentSettings: paymentHook.savePaymentSettings,
    
    // Special functions
    triggerManualCheck: closureHook.triggerManualCheck,
    testPrinter,
    checkPrinterStatus: async () => {
      // TODO: Implement printer status check
    },
  };
};