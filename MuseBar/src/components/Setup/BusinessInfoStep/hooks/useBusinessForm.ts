/**
 * Business Form Management
 * Handles form state updates and input formatting
 */

import { useCallback } from 'react';
import { SetupFormData } from '../../../../types/setup';

interface UseBusinessFormProps {
  formData: SetupFormData;
  onUpdate: (updates: Partial<SetupFormData>) => void;
  onFieldError?: (field: string) => void;
}

export const useBusinessForm = ({ formData, onUpdate, onFieldError }: UseBusinessFormProps) => {

  /**
   * Handle standard input changes
   */
  const handleInputChange = useCallback((field: keyof SetupFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    onUpdate({ [field]: value });
    
    // Clear field error when user starts typing
    if (onFieldError) {
      onFieldError(field);
    }
  }, [onUpdate, onFieldError]);

  /**
   * Handle TVA number input with formatting
   */
  const handleTvaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s/g, '').toUpperCase();
    
    // Auto-add FR prefix if not present
    if (value.length > 0 && !value.startsWith('FR')) {
      value = 'FR' + value;
    }
    
    // Limit to 13 characters (FR + 11 digits)
    value = value.slice(0, 13);
    
    onUpdate({ tvaNumber: value });
    
    if (onFieldError) {
      onFieldError('tvaNumber');
    }
  }, [onUpdate, onFieldError]);

  /**
   * Handle SIRET number input with formatting
   */
  const handleSiretChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and limit to 14 characters
    const value = e.target.value.replace(/\D/g, '').slice(0, 14);
    onUpdate({ siretNumber: value });
    
    if (onFieldError) {
      onFieldError('siretNumber');
    }
  }, [onUpdate, onFieldError]);

  /**
   * Handle phone number input with formatting
   */
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Format as groups of 2 digits: 01 23 45 67 89
    if (value.length > 0) {
      const formatted = value.match(/.{1,2}/g)?.join(' ') || value;
      value = formatted.slice(0, 14); // Limit to 10 digits + spaces
    }
    
    onUpdate({ phone: value });
    
    if (onFieldError) {
      onFieldError('phone');
    }
  }, [onUpdate, onFieldError]);

  /**
   * Format SIRET for display (add spaces every 3 digits)
   */
  const formatSiretDisplay = useCallback((siret: string): string => {
    if (!siret) return '';
    return siret.replace(/(\d{3})(?=\d)/g, '$1 ');
  }, []);

  /**
   * Format TVA for display (add space after FR)
   */
  const formatTvaDisplay = useCallback((tva: string): string => {
    if (!tva) return '';
    if (tva.startsWith('FR') && tva.length > 2) {
      return `FR ${tva.slice(2)}`;
    }
    return tva;
  }, []);

  /**
   * Get display value for SIRET field
   */
  const getSiretDisplayValue = useCallback((): string => {
    return formatSiretDisplay(formData.siretNumber || '');
  }, [formData.siretNumber, formatSiretDisplay]);

  /**
   * Get display value for TVA field
   */
  const getTvaDisplayValue = useCallback((): string => {
    return formatTvaDisplay(formData.tvaNumber || '');
  }, [formData.tvaNumber, formatTvaDisplay]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((e: React.FormEvent, onValidSubmit: () => void) => {
    e.preventDefault();
    onValidSubmit();
  }, []);

  return {
    // Standard input handlers
    handleInputChange,
    handleSubmit,
    
    // Specialized input handlers
    handleTvaChange,
    handleSiretChange,
    handlePhoneChange,
    
    // Display formatters
    getSiretDisplayValue,
    getTvaDisplayValue,
    formatSiretDisplay,
    formatTvaDisplay,
  };
};
