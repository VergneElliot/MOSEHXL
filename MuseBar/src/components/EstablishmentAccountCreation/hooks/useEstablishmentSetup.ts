/**
 * Custom hook for establishment setup logic
 * Manages API calls and state for the establishment account creation flow
 */

import { useState, useCallback } from 'react';
import { 
  InvitationValidationResult, 
  EstablishmentAccountCreationRequest, 
  EstablishmentAccountCreationResponse 
} from '../types';
import { establishmentAccountApi } from '../../../services/establishmentAccountApi';

export interface UseEstablishmentSetupReturn {
  validateInvitation: (token: string) => Promise<InvitationValidationResult>;
  createAccount: (request: EstablishmentAccountCreationRequest) => Promise<EstablishmentAccountCreationResponse>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useEstablishmentSetup = (): UseEstablishmentSetupReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const validateInvitation = useCallback(async (token: string): Promise<InvitationValidationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await establishmentAccountApi.validateInvitation(token);
      return result;
    } catch (err: unknown) {
      const errorMessage = (err as Error)?.message || 'Failed to validate invitation';
      setError(errorMessage);
      return {
        isValid: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAccount = useCallback(async (
    request: EstablishmentAccountCreationRequest
  ): Promise<EstablishmentAccountCreationResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await establishmentAccountApi.createAccount(request);
      return result;
    } catch (err: unknown) {
      const errorMessage = (err as Error)?.message || 'Failed to create account';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    validateInvitation,
    createAccount,
    isLoading,
    error,
    clearError
  };
};
