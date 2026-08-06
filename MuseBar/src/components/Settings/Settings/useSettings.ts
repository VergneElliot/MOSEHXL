/**
 * Settings State Management Hook
 * Centralized state management for all settings functionality
 *
 * @deprecated Use individual modules from './hooks/' instead for better modularity
 * This file is maintained for backward compatibility
 */

import { useState, useEffect, useCallback } from 'react';
import { SettingsState, UseSettingsReturn } from './types';
import { useBusinessInfo, useClosureSettings } from './hooks';

interface ExtendedSettingsState extends SettingsState {
  loading: boolean;
  saving: boolean;
}

export const useSettings = (): UseSettingsReturn => {
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [state, setState] = useState<ExtendedSettingsState>({
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
      accounting_emails: [],
    },
    schedulerStatus: {
      is_running: false,
      has_interval: false,
      next_check: '',
    },
    loading: false,
    saving: false,
  });

  const businessHook = useBusinessInfo({
    businessInfo: state.businessInfo,
    onUpdate: (info) => {
      setInfoMessage(null);
      setState(prev => ({ ...prev, businessInfo: info }));
    },
    onLoadingChange: (loading) => setState(prev => ({ ...prev, loading })),
    onSavingChange: (saving) => setState(prev => ({ ...prev, saving })),
  });

  const closureHook = useClosureSettings({
    closureSettings: state.closureSettings,
    onUpdate: (settings) => setState(prev => ({ ...prev, closureSettings: settings })),
    onSchedulerUpdate: (scheduler) => setState(prev => ({ ...prev, schedulerStatus: scheduler })),
    onLoadingChange: (loading) => setState(prev => ({ ...prev, loading })),
    onSavingChange: (saving) => setState(prev => ({ ...prev, saving })),
  });

  useEffect(() => {
    loadAllSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllSettings = async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      await Promise.all([
        businessHook.loadBusinessInfo(),
        closureHook.loadClosureSettings(),
      ]);
    } catch {
      // Individual hooks log their own errors; keep partial state.
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const saveBusinessInfo = useCallback(async () => {
    try {
      await businessHook.saveBusinessInfo();
      setInfoMessage("Informations de l'établissement enregistrées.");
    } catch (error) {
      setInfoMessage(null);
      throw error;
    }
  }, [businessHook.saveBusinessInfo]);

  return {
    state: {
      businessInfo: state.businessInfo,
      closureSettings: state.closureSettings,
      schedulerStatus: state.schedulerStatus,
    },
    loading: state.loading,
    saving: state.saving,
    infoSaving: state.saving,
    infoMessage,

    updateBusinessInfo: businessHook.updateBusinessInfo,
    updateClosureSettings: closureHook.updateClosureSettings,

    saveBusinessInfo,
    saveClosureSettings: closureHook.saveClosureSettings,

    triggerManualCheck: closureHook.triggerManualCheck,
  };
};
