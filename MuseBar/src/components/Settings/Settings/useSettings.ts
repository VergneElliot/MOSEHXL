/**
 * Settings State Management Hook
 * Centralized state management for all settings functionality
 */

import { useState, useEffect } from 'react';
import { apiService } from '../../../services/apiService';
import {
  SettingsState,
  UseSettingsReturn,
  GeneralSettings,
  BusinessInfo,
  ClosureSettings,
  PaymentSettings,
  SchedulerStatusResponse,
} from './types';

/**
 * Default settings values
 */
const defaultGeneralSettings: GeneralSettings = {
  barName: 'MuseBar',
  address: '',
  phone: '',
  email: '',
  taxIdentification: '',
  currency: 'EUR',
  language: 'fr',
};

const defaultBusinessInfo: BusinessInfo = {
  name: '',
  address: '',
  phone: '',
  email: '',
  siret: '',
  taxIdentification: '',
};

const defaultClosureSettings: ClosureSettings = {
  auto_closure_enabled: true,
  daily_closure_time: '02:00',
  timezone: 'Europe/Paris',
  grace_period_minutes: 30,
};

const defaultPaymentSettings: PaymentSettings = {
  acceptCash: true,
  acceptCard: true,
  acceptChecks: false,
  taxRate: 20.0,
  discountEnabled: true,
  maxDiscountPercent: 15,
};

const defaultPrinterSettings = {
  enabled: true,
  printerName: 'Oxhoo TP85v Network',
  printReceipts: true,
  printReports: true,
};

const defaultSchedulerStatus = {
  is_running: false,
  has_interval: false,
  next_check: 'Not scheduled',
};

/**
 * Settings Hook
 */
export const useSettings = (): UseSettingsReturn => {
  const [state, setState] = useState<SettingsState>({
    generalSettings: defaultGeneralSettings,
    businessInfo: defaultBusinessInfo,
    closureSettings: defaultClosureSettings,
    paymentSettings: defaultPaymentSettings,
    printerSettings: defaultPrinterSettings,
    schedulerStatus: defaultSchedulerStatus,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  /**
   * Load all settings on mount
   */
  useEffect(() => {
    loadAllSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Load all settings from API
   */
  const loadAllSettings = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadBusinessInfo(),
        loadClosureSettings(),
        loadPaymentSettings(),
      ]);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load business information
   */
  const loadBusinessInfo = async () => {
    try {
      const response = await apiService.getBusinessInfo();
      setState(prev => ({
        ...prev,
        businessInfo: {
          name: response.name || '',
          address: response.address || '',
          phone: response.phone || '',
          email: response.email || '',
          siret: response.siret || '',
          taxIdentification: response.tax_identification || '',
        },
      }));
    } catch (error) {
      console.error('Error loading business info:', error);
    }
  };

  /**
   * Load closure settings
   */
  const loadClosureSettings = async () => {
    try {
      const response = await apiService.get<SchedulerStatusResponse>('/legal/settings/closure');
      setState(prev => ({
        ...prev,
        closureSettings: response.data.settings,
        schedulerStatus: response.data.scheduler,
      }));
    } catch (error) {
      console.error('Error loading closure settings:', error);
    }
  };

  /**
   * Load payment settings (placeholder)
   */
  const loadPaymentSettings = async () => {
    try {
      // TODO: Implement when API endpoint is available
      // const response = await apiService.get('/settings/payment');
      // setState(prev => ({ ...prev, paymentSettings: response.data }));
    } catch (error) {
      console.error('Error loading payment settings:', error);
    }
  };

  /**
   * Update general settings
   */
  const updateGeneralSettings = (generalSettings: GeneralSettings) => {
    setState(prev => ({ ...prev, generalSettings }));
  };

  /**
   * Update business info
   */
  const updateBusinessInfo = (businessInfo: BusinessInfo) => {
    setState(prev => ({ ...prev, businessInfo }));
  };

  /**
   * Update closure settings
   */
  const updateClosureSettings = (closureSettings: ClosureSettings) => {
    setState(prev => ({ ...prev, closureSettings }));
  };

  /**
   * Update payment settings
   */
  const updatePaymentSettings = (paymentSettings: PaymentSettings) => {
    setState(prev => ({ ...prev, paymentSettings }));
  };

  /**
   * Save general settings
   */
  const saveGeneralSettings = async (): Promise<void> => {
    setSaving(true);
    try {
      // TODO: Implement API call for general settings
      // await apiService.post('/settings/general', state.generalSettings);
      console.log('General settings saved:', state.generalSettings);
    } catch (error) {
      console.error('Error saving general settings:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Save business info
   */
  const saveBusinessInfo = async (): Promise<void> => {
    setInfoSaving(true);
    setInfoMessage(null);
    try {
      await apiService.updateBusinessInfo({
        name: state.businessInfo.name,
        address: state.businessInfo.address,
        phone: state.businessInfo.phone,
        email: state.businessInfo.email,
        siret: state.businessInfo.siret,
        tax_identification: state.businessInfo.taxIdentification,
      });
      setInfoMessage('Informations du bar sauvegardées avec succès');
    } catch (error) {
      setInfoMessage('Erreur lors de la sauvegarde des informations du bar');
      throw error;
    } finally {
      setInfoSaving(false);
    }
  };

  /**
   * Save closure settings
   */
  const saveClosureSettings = async (): Promise<void> => {
    setSaving(true);
    try {
      await apiService.post<any>('/legal/settings/closure', state.closureSettings);
      await loadClosureSettings(); // Reload to get updated data
    } catch (error) {
      console.error('Error saving closure settings:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Save payment settings
   */
  const savePaymentSettings = async (): Promise<void> => {
    setSaving(true);
    try {
      // TODO: Implement API call for payment settings
      // await apiService.post('/settings/payment', state.paymentSettings);
      console.log('Payment settings saved:', state.paymentSettings);
    } catch (error) {
      console.error('Error saving payment settings:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Trigger manual closure check
   */
  const triggerManualCheck = async (): Promise<void> => {
    try {
      await apiService.post<any>('/legal/scheduler/trigger');
      await loadClosureSettings(); // Reload status
    } catch (error) {
      console.error('Error triggering manual check:', error);
      throw error;
    }
  };

  /**
   * Test printer
   */
  const testPrinter = async (): Promise<void> => {
    try {
      const response = await apiService.post<any>('/legal/thermal-printer/test', {});
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Test failed');
      }
    } catch (error) {
      console.error('Error testing printer:', error);
      throw error;
    }
  };

  /**
   * Check printer status
   */
  const checkPrinterStatus = async (): Promise<void> => {
    try {
      const response = await apiService.get<any>('/legal/thermal-printer/status');
      const status = response.data;
      
      if (!status.available) {
        throw new Error(status.status || 'Printer not available');
      }
    } catch (error) {
      console.error('Error checking printer status:', error);
      throw error;
    }
  };

  return {
    state,
    loading,
    saving,
    infoSaving,
    infoMessage,
    updateGeneralSettings,
    updateBusinessInfo,
    updateClosureSettings,
    updatePaymentSettings,
    saveGeneralSettings,
    saveBusinessInfo,
    saveClosureSettings,
    savePaymentSettings,
    triggerManualCheck,
    testPrinter,
    checkPrinterStatus,
  };
};

