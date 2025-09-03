/**
 * Happy Hour Settings Management
 * Handles CRUD operations for happy hour settings
 */

import { useCallback } from 'react';
import { HappyHourService } from '../../../../services/happyHourService';
import { HappyHourSettings } from '../types';

interface UseHappyHourSettingsProps {
  onSettingsUpdate: (settings: HappyHourSettings) => void;
  onStatusUpdate: () => void;
}

export const useHappyHourSettings = ({ onSettingsUpdate, onStatusUpdate }: UseHappyHourSettingsProps) => {
  const happyHourService = HappyHourService.getInstance();

  /**
   * Update happy hour settings
   */
  const updateSettings = useCallback(async (settings: HappyHourSettings) => {
    try {
      await happyHourService.updateSettings(settings);
      onSettingsUpdate(settings);
      onStatusUpdate();
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }, [happyHourService, onSettingsUpdate, onStatusUpdate]);

  /**
   * Enable happy hour
   */
  const enableHappyHour = useCallback(async (settings: HappyHourSettings) => {
    const enabledSettings = { ...settings, isEnabled: true };
    await updateSettings(enabledSettings);
  }, [updateSettings]);

  /**
   * Disable happy hour
   */
  const disableHappyHour = useCallback(async (settings: HappyHourSettings) => {
    const disabledSettings = { ...settings, isEnabled: false };
    await updateSettings(disabledSettings);
  }, [updateSettings]);

  /**
   * Toggle happy hour enabled state
   */
  const toggleHappyHour = useCallback(async (settings: HappyHourSettings) => {
    const toggledSettings = { ...settings, isEnabled: !settings.isEnabled };
    await updateSettings(toggledSettings);
  }, [updateSettings]);

  /**
   * Update time settings
   */
  const updateTimeSettings = useCallback(async (
    settings: HappyHourSettings,
    startTime: string,
    endTime: string
  ) => {
    const timeSettings = { ...settings, startTime, endTime };
    await updateSettings(timeSettings);
  }, [updateSettings]);

  /**
   * Update discount settings
   */
  const updateDiscountSettings = useCallback(async (
    settings: HappyHourSettings,
    discountType: 'percentage' | 'fixed',
    discountValue: number
  ) => {
    const discountSettings = { ...settings, discountType, discountValue };
    await updateSettings(discountSettings);
  }, [updateSettings]);

  return {
    updateSettings,
    enableHappyHour,
    disableHappyHour,
    toggleHappyHour,
    updateTimeSettings,
    updateDiscountSettings,
  };
};
