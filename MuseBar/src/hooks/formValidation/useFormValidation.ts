/**
 * Core Form Validation Hook
 * Main hook that orchestrates validation with debouncing and state management
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ValidationRules, UseFormValidationOptions, UseFormValidationReturn, DEFAULT_OPTIONS, FieldError } from './types';
import { validateField } from './validators';
import { FormErrorManager } from './errorManager';

export const useFormValidation = <T extends Record<string, any>>(
  rules: ValidationRules,
  options: UseFormValidationOptions = {}
): UseFormValidationReturn<T> => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const [isValidating, setIsValidating] = useState(false);
  const [debounceTimeouts, setDebounceTimeouts] = useState<Record<string, NodeJS.Timeout>>({});

  // Initialize error manager
  const errorManager = useMemo(() => new FormErrorManager<T>(), []);
  const [, forceUpdate] = useState({});
  const triggerUpdate = useCallback(() => forceUpdate({}), []);

  /**
   * Validate a single field
   */
  const validateFieldAsync = useCallback(async (field: keyof T, value: any): Promise<FieldError[]> => {
    const fieldRules = rules[field as string];
    if (!fieldRules) return [];

    setIsValidating(true);
    try {
      const errors = await validateField(field as string, value, fieldRules);
      
      // Update errors for this field
      errorManager.clearErrors(field);
      errorManager.addErrors(errors);
      triggerUpdate();
      
      return errors;
    } finally {
      setIsValidating(false);
    }
  }, [rules, errorManager, triggerUpdate]);

  /**
   * Validate the entire form
   */
  const validateForm = useCallback(async (data: T): Promise<FieldError[]> => {
    setIsValidating(true);
    const allErrors: FieldError[] = [];

    try {
      // Validate each field
      for (const [fieldName, fieldRules] of Object.entries(rules)) {
        if (fieldRules) {
          const fieldErrors = await validateField(fieldName, data[fieldName], fieldRules);
          allErrors.push(...fieldErrors);
          
          if (config.stopOnFirstError && fieldErrors.length > 0) {
            break;
          }
        }
      }

      // Update all errors
      errorManager.setErrors(allErrors);
      triggerUpdate();
      
      return allErrors;
    } finally {
      setIsValidating(false);
    }
  }, [rules, config.stopOnFirstError, errorManager, triggerUpdate]);

  /**
   * Debounced field validation
   */
  const debouncedValidateField = useCallback((field: keyof T, value: any) => {
    if (!config.validateOnChange) return;

    // Clear existing timeout for this field
    if (debounceTimeouts[field as string]) {
      clearTimeout(debounceTimeouts[field as string]);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      validateFieldAsync(field, value);
      setDebounceTimeouts(prev => {
        const { [field as string]: removed, ...rest } = prev;
        return rest;
      });
    }, config.debounceMs);

    setDebounceTimeouts(prev => ({
      ...prev,
      [field as string]: timeout,
    }));
  }, [config.validateOnChange, config.debounceMs, debounceTimeouts, validateFieldAsync]);

  /**
   * Clear errors for a field or all fields
   */
  const clearErrors = useCallback((field?: keyof T) => {
    errorManager.clearErrors(field);
    triggerUpdate();
  }, [errorManager, triggerUpdate]);

  /**
   * Set a custom error for a field
   */
  const setCustomError = useCallback((field: keyof T, message: string) => {
    errorManager.setCustomError(field, message);
    triggerUpdate();
  }, [errorManager, triggerUpdate]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [debounceTimeouts]);

  return {
    errors: errorManager.getErrors(),
    isValid: errorManager.isValid(),
    isValidating,
    validateField: validateFieldAsync,
    validateForm,
    clearErrors,
    setCustomError,
    getFieldErrors: errorManager.getFieldErrors.bind(errorManager),
    isFieldValid: errorManager.isFieldValid.bind(errorManager),
    hasErrors: errorManager.hasErrors(),
    errorCount: errorManager.getErrorCount(),
  };
};
