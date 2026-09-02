import { logger } from '../../../../utils/logger';
/**
 * Closure Settings Management
 * Handles automated daily closure configuration and scheduling
 */

import { useCallback } from 'react';
import { apiService } from '../../../../services/apiService';
import { ClosureSettings, SchedulerStatus } from '../types';

const defaultClosureSettings: ClosureSettings = {
  auto_closure_enabled: true,
  daily_closure_time: '02:00',
  timezone: 'Europe/Paris',
  grace_period_minutes: 30,
  accounting_emails: [],
};

interface ClosureSettingsApiResponse {
  settings?: ClosureSettings;
  scheduler?: SchedulerStatus;
  auto_closure_enabled?: string;
  daily_closure_time?: string;
  timezone?: string;
  grace_period_minutes?: string;
}

interface UseClosureSettingsProps {
  closureSettings: ClosureSettings;
  onUpdate: (settings: ClosureSettings) => void;
  onSchedulerUpdate?: (scheduler: SchedulerStatus) => void;
  onLoadingChange: (loading: boolean) => void;
  onSavingChange: (saving: boolean) => void;
}

function parseSettingsPayload(data: ClosureSettingsApiResponse | null | undefined): ClosureSettings {
  if (data?.settings) {
    return {
      auto_closure_enabled: Boolean(data.settings.auto_closure_enabled),
      daily_closure_time: data.settings.daily_closure_time || defaultClosureSettings.daily_closure_time,
      timezone: data.settings.timezone || defaultClosureSettings.timezone,
      grace_period_minutes:
        typeof data.settings.grace_period_minutes === 'number'
          ? data.settings.grace_period_minutes
          : defaultClosureSettings.grace_period_minutes,
      accounting_emails: Array.isArray(data.settings.accounting_emails)
        ? data.settings.accounting_emails
        : defaultClosureSettings.accounting_emails,
    };
  }

  return {
    auto_closure_enabled: data?.auto_closure_enabled === 'true',
    daily_closure_time: data?.daily_closure_time || defaultClosureSettings.daily_closure_time,
    timezone: data?.timezone || defaultClosureSettings.timezone,
    grace_period_minutes: data?.grace_period_minutes
      ? parseInt(data.grace_period_minutes, 10) || defaultClosureSettings.grace_period_minutes
      : defaultClosureSettings.grace_period_minutes,
    accounting_emails: defaultClosureSettings.accounting_emails,
  };
}

export const useClosureSettings = ({
  closureSettings,
  onUpdate,
  onSchedulerUpdate,
  onLoadingChange,
  onSavingChange,
}: UseClosureSettingsProps) => {
  const loadClosureSettings = useCallback(async () => {
    onLoadingChange(true);
    try {
      const { data } = await apiService.get<ClosureSettingsApiResponse>('/legal/closure-settings');
      onUpdate(parseSettingsPayload(data));
      if (data?.scheduler && onSchedulerUpdate) {
        onSchedulerUpdate(data.scheduler);
      }
    } catch (error) {
      logger.error('Error loading closure settings:', error);
      onUpdate(defaultClosureSettings);
    } finally {
      onLoadingChange(false);
    }
  }, [onUpdate, onSchedulerUpdate, onLoadingChange]);

  const updateClosureSettings = useCallback(
    (updates: Partial<ClosureSettings>) => {
      onUpdate({ ...closureSettings, ...updates });
    },
    [closureSettings, onUpdate]
  );

  const validateClosureSettings = useCallback((settings: ClosureSettings): string[] => {
    const errors: string[] = [];

    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(settings.daily_closure_time)) {
      errors.push('Invalid time format (use HH:MM)');
    }

    if (settings.grace_period_minutes < 0 || settings.grace_period_minutes > 120) {
      errors.push('Grace period must be between 0 and 120 minutes');
    }

    return errors;
  }, []);

  const saveClosureSettings = useCallback(async (): Promise<void> => {
    const errors = validateClosureSettings(closureSettings);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    onSavingChange(true);
    try {
      const { data } = await apiService.put<ClosureSettingsApiResponse>('/legal/closure-settings', {
        ...closureSettings,
      });
      onUpdate(parseSettingsPayload(data));
      if (data?.scheduler && onSchedulerUpdate) {
        onSchedulerUpdate(data.scheduler);
      }
    } catch (error) {
      logger.error('Error saving closure settings:', error);
      throw error;
    } finally {
      onSavingChange(false);
    }
  }, [closureSettings, validateClosureSettings, onSavingChange, onUpdate, onSchedulerUpdate]);

  const triggerManualCheck = useCallback(async (): Promise<void> => {
    onSavingChange(true);
    try {
      const { data } = await apiService.post<{ scheduler?: SchedulerStatus }>(
        '/legal/closure-settings/trigger-check',
        {}
      );
      if (data?.scheduler && onSchedulerUpdate) {
        onSchedulerUpdate(data.scheduler);
      }
    } catch (error) {
      logger.error('Error triggering manual closure check:', error);
      throw error;
    } finally {
      onSavingChange(false);
    }
  }, [onSavingChange, onSchedulerUpdate]);

  const resetToDefaults = useCallback(() => {
    onUpdate(defaultClosureSettings);
  }, [onUpdate]);

  const getNextClosureTime = useCallback((): Date => {
    const now = new Date();
    const [hours = 0, minutes = 0] = closureSettings.daily_closure_time.split(':').map(Number);
    const nextClosure = new Date();
    nextClosure.setHours(hours, minutes, 0, 0);

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
