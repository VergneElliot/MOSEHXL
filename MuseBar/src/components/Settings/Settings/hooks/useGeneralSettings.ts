/**
 * General Settings Management
 * Handles basic application and UI configuration
 */

import { useCallback } from 'react';
import { GeneralSettings } from '../types';

const defaultGeneralSettings: GeneralSettings = {
  barName: 'MuseBar',
  address: '',
  phone: '',
  email: '',
  taxIdentification: '',
  currency: 'EUR',
  language: 'fr',
};

interface UseGeneralSettingsProps {
  generalSettings: GeneralSettings;
  onUpdate: (settings: GeneralSettings) => void;
  onSave: () => Promise<void>;
}

export const useGeneralSettings = ({ generalSettings, onUpdate, onSave }: UseGeneralSettingsProps) => {
  /**
   * Update general settings
   */
  const updateGeneralSettings = useCallback((updates: Partial<GeneralSettings>) => {
    onUpdate({ ...generalSettings, ...updates });
  }, [generalSettings, onUpdate]);

  /**
   * Reset to defaults
   */
  const resetToDefaults = useCallback(() => {
    onUpdate(defaultGeneralSettings);
  }, [onUpdate]);

  /**
   * Validate general settings
   */
  const validateSettings = useCallback((settings: GeneralSettings): string[] => {
    const errors: string[] = [];
    
    if (!settings.barName.trim()) {
      errors.push('Bar name is required');
    }
    
    if (settings.email && !/\S+@\S+\.\S+/.test(settings.email)) {
      errors.push('Invalid email format');
    }
    
    if (settings.phone && !/^[\d\s\-\+\(\)]+$/.test(settings.phone)) {
      errors.push('Invalid phone number format');
    }
    
    return errors;
  }, []);

  /**
   * Save general settings with validation
   */
  const saveWithValidation = useCallback(async () => {
    const errors = validateSettings(generalSettings);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    await onSave();
  }, [generalSettings, validateSettings, onSave]);

  return {
    generalSettings,
    updateGeneralSettings,
    resetToDefaults,
    validateSettings,
    saveWithValidation,
    defaultSettings: defaultGeneralSettings,
  };
};
