/**
 * Form Validation Types
 * Type definitions and interfaces for form validation
 */

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
  stopOnFirstError?: boolean;
  showErrorsOnSubmit?: boolean;
}

export interface UseFormValidationReturn<T> {
  errors: FieldError[];
  isValid: boolean;
  isValidating: boolean;
  validateField: (field: keyof T, value: any) => Promise<FieldError[]>;
  validateForm: (data: T) => Promise<FieldError[]>;
  clearErrors: (field?: keyof T) => void;
  setCustomError: (field: keyof T, message: string) => void;
  getFieldErrors: (field: keyof T) => FieldError[];
  isFieldValid: (field: keyof T) => boolean;
  hasErrors: boolean;
  errorCount: number;
}

export const DEFAULT_OPTIONS: UseFormValidationOptions = {
  validateOnChange: true,
  validateOnBlur: true,
  debounceMs: 300,
  stopOnFirstError: false,
  showErrorsOnSubmit: true,
};
