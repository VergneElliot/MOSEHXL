/**
 * Custom hook for account creation logic
 * Manages password validation and account creation state
 */

import { useState, useCallback } from 'react';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number;
  strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
}

export interface UseAccountCreationReturn {
  validatePassword: (password: string) => PasswordValidationResult;
  validatePasswordMatch: (password: string, confirmPassword: string) => boolean;
  isCreating: boolean;
  setIsCreating: (creating: boolean) => void;
  clearValidation: () => void;
}

export const useAccountCreation = (): UseAccountCreationReturn => {
  const [isCreating, setIsCreating] = useState(false);

  const validatePassword = useCallback((password: string): PasswordValidationResult => {
    const errors: string[] = [];
    let score = 0;
    
    // Length check
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else {
      score += 1;
    }
    
    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 1;
    }
    
    // Lowercase check
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 1;
    }
    
    // Number check
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score += 1;
    }
    
    // Special character check
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else {
      score += 1;
    }

    // Additional length bonus
    if (password.length >= 12) {
      score += 1;
    }

    // Determine strength
    let strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
    if (score <= 1) strength = 'very-weak';
    else if (score <= 2) strength = 'weak';
    else if (score <= 3) strength = 'fair';
    else if (score <= 4) strength = 'good';
    else strength = 'strong';

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.min(score, 5),
      strength
    };
  }, []);

  const validatePasswordMatch = useCallback((password: string, confirmPassword: string): boolean => {
    return password === confirmPassword && password.length > 0;
  }, []);

  const clearValidation = useCallback(() => {
    // Reset any validation state if needed
  }, []);

  return {
    validatePassword,
    validatePasswordMatch,
    isCreating,
    setIsCreating,
    clearValidation
  };
};
