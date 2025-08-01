import { useState, useEffect, useCallback } from 'react';
import { HappyHourService } from '../services/happyHourService';

interface HappyHourState {
  isHappyHourActive: boolean;
  timeUntilHappyHour: string;
}

interface HappyHourActions {
  updateHappyHourStatus: () => void;
}

export const useHappyHour = (enabled: boolean = true): HappyHourState & HappyHourActions => {
  const [isHappyHourActive, setIsHappyHourActive] = useState(false);
  const [timeUntilHappyHour, setTimeUntilHappyHour] = useState('');

  const happyHourService = HappyHourService.getInstance();

  // Update happy hour status
  const updateHappyHourStatus = useCallback(() => {
    if (!enabled) {
      setIsHappyHourActive(false);
      setTimeUntilHappyHour('');
      return;
    }

    const isActive = happyHourService.isHappyHourActive();
    const timeUntil = happyHourService.getTimeUntilHappyHour();

    setIsHappyHourActive(isActive);
    setTimeUntilHappyHour(timeUntil);
  }, [happyHourService, enabled]);

  // Initialize and update happy hour status
  useEffect(() => {
    if (enabled) {
      updateHappyHourStatus();

      // Update every minute
      const intervalId = setInterval(updateHappyHourStatus, 60000);

      return () => clearInterval(intervalId);
    }
  }, [updateHappyHourStatus, enabled]);

  return {
    isHappyHourActive,
    timeUntilHappyHour,
    updateHappyHourStatus,
  };
}; 