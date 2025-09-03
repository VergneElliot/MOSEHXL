/**
 * Setup Submission Logic
 * Handles the final setup submission and API interaction
 */

import { useCallback } from 'react';
import { SetupFormData, InvitationValidation, BusinessSetupRequest } from '../../../../types/setup';
import { SetupService } from '../../../../services/setupService';

interface UseSetupSubmissionProps {
  onSuccess: () => void;
  onError: (error: string) => void;
  onLoading: (loading: boolean) => void;
}

export const useSetupSubmission = ({ onSuccess, onError, onLoading }: UseSetupSubmissionProps) => {

  /**
   * Build setup request from form data
   */
  const buildSetupRequest = useCallback((
    formData: SetupFormData,
    invitationData: InvitationValidation | null,
    invitationToken: string
  ): BusinessSetupRequest => {
    return {
      // User account information
      first_name: formData.firstName || '',
      last_name: formData.lastName || '',
      email: formData.email || '',
      password: formData.password || '',
      confirm_password: formData.password || '', // Use same password for confirmation
      
      // Business information
      business_name: formData.businessName || '',
      contact_email: formData.email || '',
      phone: formData.phone || '',
      address: formData.address || '',
      siret_number: formData.siretNumber || '',
      tva_number: formData.tvaNumber || '',
      
      // Invitation context
      invitation_token: invitationToken,
    };
  }, []);

  /**
   * Validate setup request data
   */
  const validateSetupRequest = useCallback((request: BusinessSetupRequest): string[] => {
    const errors: string[] = [];

    // Required user fields
    if (!request.email) errors.push('Email manquant');
    if (!request.password) errors.push('Mot de passe manquant');
    if (!request.first_name) errors.push('Prénom manquant');
    if (!request.last_name) errors.push('Nom manquant');

    // Required business fields
    if (!request.business_name) errors.push('Nom de l\'établissement manquant');
    if (!request.address) errors.push('Adresse manquante');
    if (!request.phone) errors.push('Téléphone manquant');
    if (!request.siret_number) errors.push('Numéro SIRET manquant');
    if (!request.tva_number) errors.push('Numéro de TVA manquant');

    // Invitation context
    if (!request.invitation_token) errors.push('Token d\'invitation manquant');

    return errors;
  }, []);

  /**
   * Submit the complete setup
   */
  const submitSetup = useCallback(async (
    formData: SetupFormData,
    invitationData: InvitationValidation | null,
    invitationToken: string
  ): Promise<boolean> => {
    onLoading(true);
    onError('');

    try {
      // Build setup request
      const setupRequest = buildSetupRequest(formData, invitationData, invitationToken);
      
      // Validate request
      const validationErrors = validateSetupRequest(setupRequest);
      if (validationErrors.length > 0) {
        onError(`Données incomplètes: ${validationErrors.join(', ')}`);
        return false;
      }

      // Submit to API
      const response = await SetupService.completeSetup(setupRequest);

      if (response.success) {
        onSuccess();
        return true;
      } else {
        onError(response.message || 'Erreur lors de la configuration');
        return false;
      }
    } catch (error) {
      console.error('Setup submission failed:', error);
      onError(
        error instanceof Error 
          ? error.message 
          : 'Erreur inattendue lors de la configuration'
      );
      return false;
    } finally {
      onLoading(false);
    }
  }, [buildSetupRequest, validateSetupRequest, onSuccess, onError, onLoading]);

  /**
   * Get setup summary for display
   */
  const getSetupSummary = useCallback((
    formData: SetupFormData,
    invitationData: InvitationValidation | null
  ) => {
    return {
      userInfo: {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
      },
      businessInfo: {
        name: formData.businessName,
        address: formData.address,
        phone: formData.phone,
        siret: formData.siretNumber,
        tva: formData.tvaNumber,
      },
      systemInfo: {
        posDevice: 'Terminal principal', // Default value since not in form
        printer: 'Configuration automatique', // Default value since not in form
      },
      invitationInfo: invitationData?.establishment ? {
        establishmentName: invitationData.establishment.name,
        inviterName: invitationData.establishment.email,
        role: 'Membre', // Default role
      } : null,
    };
  }, []);

  return {
    submitSetup,
    buildSetupRequest,
    validateSetupRequest,
    getSetupSummary,
  };
};
