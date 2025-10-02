/**
 * Custom hook for business information validation
 * Provides validation logic for business information forms
 */

import { useState, useCallback } from 'react';
import { BusinessInfo } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: { [key: string]: string };
}

export interface UseBusinessInfoValidationReturn {
  validateField: (field: keyof BusinessInfo, value: string) => string;
  validateAllFields: (businessInfo: BusinessInfo) => ValidationResult;
  clearErrors: () => void;
  errors: { [key: string]: string };
  setErrors: (errors: { [key: string]: string }) => void;
}

export const useBusinessInfoValidation = (): UseBusinessInfoValidationReturn => {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateField = useCallback((field: keyof BusinessInfo, value: string): string => {
    switch (field) {
      case 'companyName':
        if (!value.trim()) return 'Company name is required';
        if (value.trim().length < 2) return 'Company name must be at least 2 characters';
        if (value.trim().length > 100) return 'Company name must be less than 100 characters';
        break;
      
      case 'taxId':
        // NO RESTRICTIONS WHATSOEVER - user can enter anything or leave empty
        break;
      
      case 'siretNumber':
        // NO RESTRICTIONS WHATSOEVER - user can enter anything or leave empty
        break;
      
      case 'address':
        if (!value.trim()) return 'Address is required';
        if (value.trim().length < 5) return 'Address must be at least 5 characters';
        if (value.trim().length > 200) return 'Address must be less than 200 characters';
        break;
      
      case 'postalCode':
        if (!value.trim()) return 'Postal code is required';
        if (!/^\d{5}$/.test(value)) return 'Postal code must be exactly 5 digits';
        break;
      
      case 'city':
        if (!value.trim()) return 'City is required';
        if (value.trim().length < 2) return 'City must be at least 2 characters';
        if (value.trim().length > 50) return 'City must be less than 50 characters';
        break;
      
      case 'country':
        if (!value.trim()) return 'Country is required';
        if (value.trim().length < 2) return 'Country must be at least 2 characters';
        break;
      
      case 'businessType':
        if (!value.trim()) return 'Business type is required';
        break;
    }
    return '';
  }, []);

  const validateAllFields = useCallback((businessInfo: BusinessInfo): ValidationResult => {
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    Object.keys(businessInfo).forEach(key => {
      const field = key as keyof BusinessInfo;
      const error = validateField(field, businessInfo[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return { isValid, errors: newErrors };
  }, [validateField]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    validateField,
    validateAllFields,
    clearErrors,
    errors,
    setErrors
  };
};
