/**
 * Confirmation Form Management
 * Handles form state and validation for setup confirmation
 */

import { useState, useCallback } from 'react';

export const useConfirmationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  /**
   * Set submitting state
   */
  const setSubmittingState = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  /**
   * Set error message
   */
  const setErrorMessage = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Update terms acceptance
   */
  const updateTermsAccepted = useCallback((accepted: boolean) => {
    setTermsAccepted(accepted);
    // Clear error when terms are accepted
    if (accepted && error) {
      clearError();
    }
  }, [error, clearError]);

  /**
   * Validate form before submission
   */
  const validateForm = useCallback((): string | null => {
    if (!termsAccepted) {
      return 'Vous devez accepter les conditions générales pour continuer';
    }
    return null;
  }, [termsAccepted]);

  /**
   * Check if form is valid
   */
  const isFormValid = useCallback((): boolean => {
    return validateForm() === null;
  }, [validateForm]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setIsSubmitting(false);
    setError(null);
    setTermsAccepted(false);
  }, []);

  return {
    // State
    isSubmitting,
    error,
    termsAccepted,
    
    // Actions
    setSubmittingState,
    setErrorMessage,
    clearError,
    updateTermsAccepted,
    
    // Validation
    validateForm,
    isFormValid,
    resetForm,
  };
};
