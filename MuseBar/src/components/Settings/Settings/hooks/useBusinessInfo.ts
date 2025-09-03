/**
 * Business Information Management
 * Handles company and legal business details
 */

import { useCallback } from 'react';
import { apiService } from '../../../../services/apiService';
import { BusinessInfo } from '../types';

const defaultBusinessInfo: BusinessInfo = {
  name: '',
  address: '',
  phone: '',
  email: '',
  siret: '',
  taxIdentification: '',
};

interface UseBusinessInfoProps {
  businessInfo: BusinessInfo;
  onUpdate: (info: BusinessInfo) => void;
  onLoadingChange: (loading: boolean) => void;
  onSavingChange: (saving: boolean) => void;
}

export const useBusinessInfo = ({ 
  businessInfo, 
  onUpdate, 
  onLoadingChange, 
  onSavingChange 
}: UseBusinessInfoProps) => {

  /**
   * Load business information from API
   */
  const loadBusinessInfo = useCallback(async () => {
    onLoadingChange(true);
    try {
      const response = await apiService.get<BusinessInfo>('/settings/business');
      onUpdate({ ...defaultBusinessInfo, ...response });
    } catch (error) {
      console.error('Error loading business info:', error);
      onUpdate(defaultBusinessInfo);
    } finally {
      onLoadingChange(false);
    }
  }, [onUpdate, onLoadingChange]);

  /**
   * Update business information
   */
  const updateBusinessInfo = useCallback((updates: Partial<BusinessInfo>) => {
    onUpdate({ ...businessInfo, ...updates });
  }, [businessInfo, onUpdate]);

  /**
   * Validate business information
   */
  const validateBusinessInfo = useCallback((info: BusinessInfo): string[] => {
    const errors: string[] = [];
    
    if (!info.name.trim()) {
      errors.push('Business name is required');
    }
    
    if (!info.address.trim()) {
      errors.push('Business address is required');
    }
    
    if (info.email && !/\S+@\S+\.\S+/.test(info.email)) {
      errors.push('Invalid email format');
    }
    
    if (info.phone && !/^[\d\s\-\+\(\)]+$/.test(info.phone)) {
      errors.push('Invalid phone number format');
    }
    
    if (info.siret && !/^\d{14}$/.test(info.siret.replace(/\s/g, ''))) {
      errors.push('SIRET must be 14 digits');
    }
    
    return errors;
  }, []);

  /**
   * Save business information
   */
  const saveBusinessInfo = useCallback(async (): Promise<void> => {
    const errors = validateBusinessInfo(businessInfo);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    onSavingChange(true);
    try {
      await apiService.post<BusinessInfo>('/settings/business', businessInfo);
      await loadBusinessInfo(); // Reload to get updated data
    } catch (error) {
      console.error('Error saving business info:', error);
      throw error;
    } finally {
      onSavingChange(false);
    }
  }, [businessInfo, validateBusinessInfo, onSavingChange, loadBusinessInfo]);

  /**
   * Reset to defaults
   */
  const resetToDefaults = useCallback(() => {
    onUpdate(defaultBusinessInfo);
  }, [onUpdate]);

  return {
    businessInfo,
    loadBusinessInfo,
    updateBusinessInfo,
    validateBusinessInfo,
    saveBusinessInfo,
    resetToDefaults,
    defaultInfo: defaultBusinessInfo,
  };
};
