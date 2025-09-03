/**
 * Form Validation Utilities
 * Core validation functions and rule processors
 */

import { ValidationRule, FieldError } from './types';

/**
 * Validate a single field against its rules
 */
export const validateField = async <T>(
  field: string,
  value: any,
  rules: ValidationRule | ValidationRule[]
): Promise<FieldError[]> => {
  const errors: FieldError[] = [];
  const ruleArray = Array.isArray(rules) ? rules : [rules];

  for (const rule of ruleArray) {
    // Required validation
    if (rule.required && (value === null || value === undefined || value === '')) {
      errors.push({
        field,
        message: rule.message || `${field} is required`,
        type: 'required',
      });
      continue;
    }

    // Skip other validations if value is empty and not required
    if (!rule.required && (value === null || value === undefined || value === '')) {
      continue;
    }

    // Min length validation
    if (rule.minLength && value.length < rule.minLength) {
      errors.push({
        field,
        message: rule.message || `${field} must be at least ${rule.minLength} characters`,
        type: 'minLength',
      });
    }

    // Max length validation
    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push({
        field,
        message: rule.message || `${field} must be no more than ${rule.maxLength} characters`,
        type: 'maxLength',
      });
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push({
        field,
        message: rule.message || `${field} format is invalid`,
        type: 'pattern',
      });
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        errors.push({
          field,
          message: customError,
          type: 'custom',
        });
      }
    }
  }

  return errors;
};

/**
 * Common validation patterns
 */
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  url: /^https?:\/\/.+/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numeric: /^\d+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
};

/**
 * Common validation rules
 */
export const commonRules = {
  required: { required: true },
  email: { pattern: validationPatterns.email, message: 'Please enter a valid email address' },
  phone: { pattern: validationPatterns.phone, message: 'Please enter a valid phone number' },
  strongPassword: { 
    pattern: validationPatterns.password, 
    message: 'Password must be at least 8 characters with uppercase, lowercase, and number' 
  },
  minLength: (length: number) => ({ 
    minLength: length, 
    message: `Must be at least ${length} characters` 
  }),
  maxLength: (length: number) => ({ 
    maxLength: length, 
    message: `Must be no more than ${length} characters` 
  }),
};
