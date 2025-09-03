/**
 * Closure Settings Management
 * Handles automated daily closure configuration and scheduling
 */

import { useCallback } from 'react';
import { apiService } from '../../../../services/apiService';
import { ClosureSettings, SchedulerStatusResponse } from '../types';

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
   * Load closure settings from API
   */
  const loadClosureSettings = useCallback(async () => {
    onLoadingChange(true);
    try {
      const response = await apiService.get<SchedulerStatusResponse>('/legal/settings/closure');
      
      // Extract settings from the response structure
      const settings = response.data?.settings || defaultClosureSettings;
      onUpdate({
        auto_closure_enabled: settings.auto_closure_enabled ?? defaultClosureSettings.auto_closure_enabled,
        daily_closure_time: settings.daily_closure_time ?? defaultClosureSettings.daily_closure_time,
        timezone: settings.timezone ?? defaultClosureSettings.timezone,
        grace_period_minutes: settings.grace_period_minutes ?? defaultClosureSettings.grace_period_minutes,
      });
    } catch (error) {
      console.error('Error loading closure settings:', error);
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
   * Save closure settings
   */
  const saveClosureSettings = useCallback(async (): Promise<void> => {
    const errors = validateClosureSettings(closureSettings);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    onSavingChange(true);
    try {
      await apiService.post<any>('/legal/settings/closure', closureSettings);
      await loadClosureSettings(); // Reload to get updated data
    } catch (error) {
      console.error('Error saving closure settings:', error);
      throw error;
    } finally {
      onSavingChange(false);
    }
  }, [closureSettings, validateClosureSettings, onSavingChange, loadClosureSettings]);

  /**
   * Trigger manual closure check
   */
  const triggerManualCheck = useCallback(async (): Promise<void> => {
    onSavingChange(true);
    try {
      await apiService.post<any>('/legal/scheduler/trigger');
      await loadClosureSettings(); // Reload status
    } catch (error) {
      console.error('Error triggering manual check:', error);
      throw error;
    } finally {
      onSavingChange(false);
    }
  }, [onSavingChange, loadClosureSettings]);

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
