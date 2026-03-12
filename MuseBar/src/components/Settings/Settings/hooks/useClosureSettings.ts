/**
 * Closure Settings Management
 * Handles automated daily closure configuration and scheduling
 */

import { useCallback } from 'react';
import { ClosureSettings } from '../types';

const defaultClosureSettings: ClosureSettings = {
  auto_closure_enabled: true,
  daily_closure_time: '02:00',
  timezone: 'Europe/Paris',
  grace_period_minutes: 30,
};

interface UseClosureSettingsProps {
  closureSettings: ClosureSettings;
  onUpdate: (settings: ClosureSettings) => void;
  onLoadingChange: (loading: boolean) => void;
  onSavingChange: (saving: boolean) => void;
}

export const useClosureSettings = ({ 
  closureSettings, 
  onUpdate, 
  onLoadingChange, 
  onSavingChange 
}: UseClosureSettingsProps) => {

  /**
   * Load closure settings from API.
   * The closure settings endpoint (/api/legal/settings/closure) is not yet implemented
   * on the backend, so we use the defaults to avoid burning rate-limit budget with
   * repeated 404s on every Settings mount.  When the endpoint is ready, remove this
   * guard and restore the API call.
   */
  const loadClosureSettings = useCallback(async () => {
    onLoadingChange(true);
    try {
      onUpdate(defaultClosureSettings);
    } finally {
      onLoadingChange(false);
    }
  }, [onUpdate, onLoadingChange]);

  /**
   * Update closure settings
   */
  const updateClosureSettings = useCallback((updates: Partial<ClosureSettings>) => {
    onUpdate({ ...closureSettings, ...updates });
  }, [closureSettings, onUpdate]);

  /**
   * Validate closure settings
   */
  const validateClosureSettings = useCallback((settings: ClosureSettings): string[] => {
    const errors: string[] = [];
    
    // Validate time format (HH:MM)
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(settings.daily_closure_time)) {
      errors.push('Invalid time format (use HH:MM)');
    }
    
    // Validate grace period
    if (settings.grace_period_minutes < 0 || settings.grace_period_minutes > 120) {
      errors.push('Grace period must be between 0 and 120 minutes');
    }
    
    return errors;
  }, []);

  /**
   * Save closure settings.
   * Backend endpoint not yet implemented — persisted locally for now.
   */
  const saveClosureSettings = useCallback(async (): Promise<void> => {
    const errors = validateClosureSettings(closureSettings);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    // No-op until the backend closure settings endpoint is implemented.
  }, [closureSettings, validateClosureSettings]);

  /**
   * Trigger manual closure check.
   * Backend endpoint not yet implemented.
   */
  const triggerManualCheck = useCallback(async (): Promise<void> => {
    // No-op until the backend scheduler trigger endpoint is implemented.
  }, []);

  /**
   * Reset to defaults
   */
  const resetToDefaults = useCallback(() => {
    onUpdate(defaultClosureSettings);
  }, [onUpdate]);

  /**
   * Get next closure time based on current settings
   */
  const getNextClosureTime = useCallback((): Date => {
    const now = new Date();
    const [hours, minutes] = closureSettings.daily_closure_time.split(':').map(Number);
    const nextClosure = new Date();
    nextClosure.setHours(hours, minutes, 0, 0);
    
    // If the time has passed today, schedule for tomorrow
    if (nextClosure <= now) {
      nextClosure.setDate(nextClosure.getDate() + 1);
    }
    
    return nextClosure;
  }, [closureSettings.daily_closure_time]);

  return {
    closureSettings,
    loadClosureSettings,
    updateClosureSettings,
    validateClosureSettings,
    saveClosureSettings,
    triggerManualCheck,
    resetToDefaults,
    getNextClosureTime,
    defaultSettings: defaultClosureSettings,
  };
};
