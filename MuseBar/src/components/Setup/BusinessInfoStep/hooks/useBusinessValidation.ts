/**
 * Business Form Validation
 * Handles validation rules for business information form
 */

import { useState, useCallback } from 'react';
import { SetupFormData } from '../../../../types/setup';

export const useBusinessValidation = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate business name
   */
  const validateBusinessName = useCallback((name: string): string | null => {
    if (!name.trim()) {
      return 'Le nom de l\'établissement est requis';
    }
    if (name.trim().length < 2) {
      return 'Le nom doit contenir au moins 2 caractères';
    }
    return null;
  }, []);

  /**
   * Validate email address
   */
  const validateEmail = useCallback((email: string): string | null => {
    if (!email.trim()) {
      return 'L\'email est requis';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Format d\'email invalide';
    }
    return null;
  }, []);

  /**
   * Validate phone number
   */
  const validatePhone = useCallback((phone: string): string | null => {
    if (!phone.trim()) {
      return 'Le numéro de téléphone est requis';
    }
    const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
    if (!phoneRegex.test(phone)) {
      return 'Format de téléphone invalide (ex: 01 23 45 67 89)';
    }
    return null;
  }, []);

  /**
   * Validate address
   */
  const validateAddress = useCallback((address: string): string | null => {
    if (!address.trim()) {
      return 'L\'adresse est requise';
    }
    if (address.trim().length < 10) {
      return 'L\'adresse doit être plus détaillée';
    }
    return null;
  }, []);

  /**
   * Validate SIRET number
   */
  const validateSiret = useCallback((siret: string): string | null => {
    if (!siret.trim()) {
      return 'Le numéro SIRET est requis';
    }
    const cleanSiret = siret.replace(/\s/g, '');
    if (cleanSiret.length !== 14) {
      return 'Le SIRET doit contenir exactement 14 chiffres';
    }
    if (!/^\d{14}$/.test(cleanSiret)) {
      return 'Le SIRET ne doit contenir que des chiffres';
    }
    return null;
  }, []);

  /**
   * Validate TVA number
   */
  const validateTva = useCallback((tva: string): string | null => {
    if (!tva.trim()) {
      return 'Le numéro de TVA est requis';
    }
    const cleanTva = tva.replace(/\s/g, '').toUpperCase();
    if (!cleanTva.startsWith('FR')) {
      return 'Le numéro de TVA doit commencer par FR';
    }
    if (cleanTva.length !== 13) {
      return 'Le numéro de TVA doit contenir 13 caractères (FR + 11 chiffres)';
    }
    if (!/^FR\d{11}$/.test(cleanTva)) {
      return 'Format de TVA invalide (ex: FR12345678901)';
    }
    return null;
  }, []);

  /**
   * Validate all form fields
   */
  const validateForm = useCallback((formData: SetupFormData): boolean => {
    const newErrors: Record<string, string> = {};

    const businessNameError = validateBusinessName(formData.businessName || '');
    if (businessNameError) newErrors.businessName = businessNameError;

    const emailError = validateEmail(formData.email || '');
    if (emailError) newErrors.email = emailError;

    const phoneError = validatePhone(formData.phone || '');
    if (phoneError) newErrors.phone = phoneError;

    const addressError = validateAddress(formData.address || '');
    if (addressError) newErrors.address = addressError;

    const siretError = validateSiret(formData.siretNumber || '');
    if (siretError) newErrors.siretNumber = siretError;

    const tvaError = validateTva(formData.tvaNumber || '');
    if (tvaError) newErrors.tvaNumber = tvaError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [validateBusinessName, validateEmail, validatePhone, validateAddress, validateSiret, validateTva]);

  /**
   * Clear specific field error
   */
  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Get error for specific field
   */
  const getFieldError = useCallback((field: string): string | undefined => {
    return errors[field];
  }, [errors]);

  /**
   * Check if form has any errors
   */
  const hasErrors = useCallback((): boolean => {
    return Object.keys(errors).length > 0;
  }, [errors]);

  return {
    errors,
    validateForm,
    validateBusinessName,
    validateEmail,
    validatePhone,
    validateAddress,
    validateSiret,
    validateTva,
    clearFieldError,
    clearAllErrors,
    getFieldError,
    hasErrors,
  };
};
