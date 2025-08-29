/**
 * Form Validation Hook
 * Advanced form validation with real-time feedback and error handling
 */

import { useState, useCallback, useMemo } from 'react';

export interface ValidationRule<T = any> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => string | null;
  message?: string;
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule | ValidationRule[];
}

export interface FieldError {
  field: string;
  message: string;
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
}

export interface UseFormValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

export interface UseFormValidationReturn<T> {
  values: T;
  errors: FieldError[];
  touched: Record<keyof T, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  setValue: (field: keyof T, value: any) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: keyof T, message: string) => void;
  clearError: (field: keyof T) => void;
  clearErrors: () => void;
  validateField: (field: keyof T) => boolean;
  validateForm: () => boolean;
  handleChange: (field: keyof T) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (field: keyof T) => () => void;
  handleSubmit: (onSubmit: (values: T) => Promise<void> | void) => (event: React.FormEvent) => Promise<void>;
  reset: (newValues?: T) => void;
  getFieldError: (field: keyof T) => string | null;
  isFieldTouched: (field: keyof T) => boolean;
  isFieldValid: (field: keyof T) => boolean;
}

export const useFormValidation = <T extends Record<string, any>>(
  initialValues: T,
  validationRules: ValidationRules,
  options: UseFormValidationOptions = {}
): UseFormValidationReturn<T> => {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300,
  } = options;

  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debounceTimeouts, setDebounceTimeouts] = useState<Record<string, NodeJS.Timeout>>({});

  const isDirty = useMemo(() => {
    return Object.keys(values).some(key => values[key] !== initialValues[key]);
  }, [values, initialValues]);

  const isValid = errors.length === 0;

  const validateSingleRule = useCallback((value: any, rule: ValidationRule): string | null => {
    if (rule.required && (value === null || value === undefined || value === '')) {
      return rule.message || 'This field is required';
    }

    if (value && rule.minLength && String(value).length < rule.minLength) {
      return rule.message || `Minimum length is ${rule.minLength} characters`;
    }

    if (value && rule.maxLength && String(value).length > rule.maxLength) {
      return rule.message || `Maximum length is ${rule.maxLength} characters`;
    }

    if (value && rule.pattern && !rule.pattern.test(String(value))) {
      return rule.message || 'Invalid format';
    }

    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }, []);

  const validateField = useCallback((field: keyof T): boolean => {
    const value = values[field];
    const rules = validationRules[field as string];
    
    if (!rules) return true;

    const rulesToCheck = Array.isArray(rules) ? rules : [rules];
    const fieldErrors: FieldError[] = [];

    for (const rule of rulesToCheck) {
      const error = validateSingleRule(value, rule);
      if (error) {
        let errorType: FieldError['type'] = 'custom';
        if (rule.required && (value === null || value === undefined || value === '')) {
          errorType = 'required';
        } else if (rule.minLength) {
          errorType = 'minLength';
        } else if (rule.maxLength) {
          errorType = 'maxLength';
        } else if (rule.pattern) {
          errorType = 'pattern';
        }

        fieldErrors.push({
          field: field as string,
          message: error,
          type: errorType,
        });
        break; // Stop at first error
      }
    }

    // Update errors state
    setErrors(prev => [
      ...prev.filter(error => error.field !== field),
      ...fieldErrors,
    ]);

    return fieldErrors.length === 0;
  }, [values, validationRules, validateSingleRule]);

  const validateForm = useCallback((): boolean => {
    const allErrors: FieldError[] = [];

    Object.keys(validationRules).forEach(fieldName => {
      const field = fieldName as keyof T;
      const value = values[field];
      const rules = validationRules[fieldName];
      const rulesToCheck = Array.isArray(rules) ? rules : [rules];

      for (const rule of rulesToCheck) {
        const error = validateSingleRule(value, rule);
        if (error) {
          let errorType: FieldError['type'] = 'custom';
          if (rule.required && (value === null || value === undefined || value === '')) {
            errorType = 'required';
          } else if (rule.minLength) {
            errorType = 'minLength';
          } else if (rule.maxLength) {
            errorType = 'maxLength';
          } else if (rule.pattern) {
            errorType = 'pattern';
          }

          allErrors.push({
            field: fieldName,
            message: error,
            type: errorType,
          });
          break;
        }
      }
    });

    setErrors(allErrors);
    return allErrors.length === 0;
  }, [values, validationRules, validateSingleRule]);

  const setValue = useCallback((field: keyof T, value: any) => {
    setValuesState(prev => ({ ...prev, [field]: value }));
    
    if (validateOnChange) {
      // Clear existing timeout
      if (debounceTimeouts[field as string]) {
        clearTimeout(debounceTimeouts[field as string]);
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        validateField(field);
      }, debounceMs);

      setDebounceTimeouts(prev => ({
        ...prev,
        [field as string]: timeout,
      }));
    }
  }, [validateOnChange, validateField, debounceMs, debounceTimeouts]);

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  const setError = useCallback((field: keyof T, message: string) => {
    setErrors(prev => [
      ...prev.filter(error => error.field !== field),
      { field: field as string, message, type: 'custom' },
    ]);
  }, []);

  const clearError = useCallback((field: keyof T) => {
    setErrors(prev => prev.filter(error => error.field !== field));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const handleChange = useCallback((field: keyof T) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
      setValue(field, value);
    };
  }, [setValue]);

  const handleBlur = useCallback((field: keyof T) => {
    return () => {
      setTouched(prev => ({ ...prev, [field]: true }));
      
      if (validateOnBlur) {
        validateField(field);
      }
    };
  }, [validateOnBlur, validateField]);

  const handleSubmit = useCallback((onSubmit: (values: T) => Promise<void> | void) => {
    return async (event: React.FormEvent) => {
      event.preventDefault();
      
      setIsSubmitting(true);
      
      const isFormValid = validateForm();
      
      if (isFormValid) {
        try {
          await onSubmit(values);
        } catch (error) {
          console.error('Form submission error:', error);
        }
      }
      
      setIsSubmitting(false);
    };
  }, [validateForm, values]);

  const reset = useCallback((newValues?: T) => {
    const resetValues = newValues || initialValues;
    setValuesState(resetValues);
    setErrors([]);
    setTouched({} as Record<keyof T, boolean>);
    setIsSubmitting(false);
    
    // Clear debounce timeouts
    Object.values(debounceTimeouts).forEach(timeout => clearTimeout(timeout));
    setDebounceTimeouts({});
  }, [initialValues, debounceTimeouts]);

  const getFieldError = useCallback((field: keyof T): string | null => {
    const fieldError = errors.find(error => error.field === field);
    return fieldError ? fieldError.message : null;
  }, [errors]);

  const isFieldTouched = useCallback((field: keyof T): boolean => {
    return !!touched[field];
  }, [touched]);

  const isFieldValid = useCallback((field: keyof T): boolean => {
    return !errors.some(error => error.field === field);
  }, [errors]);

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      Object.values(debounceTimeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [debounceTimeouts]);

  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    isDirty,
    setValue,
    setValues,
    setError,
    clearError,
    clearErrors,
    validateField,
    validateForm,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    getFieldError,
    isFieldTouched,
    isFieldValid,
  };
};

/**
 * Quick validation utilities
 */
export const validationRules = {
  required: (message?: string): ValidationRule => ({
    required: true,
    message: message || 'This field is required',
  }),
  
  email: (message?: string): ValidationRule => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: message || 'Please enter a valid email address',
  }),
  
  minLength: (length: number, message?: string): ValidationRule => ({
    minLength: length,
    message: message || `Minimum length is ${length} characters`,
  }),
  
  maxLength: (length: number, message?: string): ValidationRule => ({
    maxLength: length,
    message: message || `Maximum length is ${length} characters`,
  }),
  
  phone: (message?: string): ValidationRule => ({
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    message: message || 'Please enter a valid phone number',
  }),
  
  password: (message?: string): ValidationRule => ({
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    message: message || 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
  }),
  
  custom: (validator: (value: any) => string | null): ValidationRule => ({
    custom: validator,
  }),
};

