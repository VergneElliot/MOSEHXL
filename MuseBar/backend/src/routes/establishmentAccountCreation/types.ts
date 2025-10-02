/**
 * Type Definitions for Establishment Account Creation
 * Clean, focused type definitions for the account creation flow
 */

/**
 * Request data for establishment account creation
 */
export interface EstablishmentAccountCreationRequest {
  token: string;
  password: string;
  businessInfo: BusinessInfo;
}

/**
 * Business information required for establishment setup
 */
export interface BusinessInfo {
  companyName: string;
  taxId: string; // French SIREN/SIRET
  siretNumber: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  businessType: string;
}

/**
 * Response data for successful account creation
 */
export interface EstablishmentAccountCreationResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      email: string;
      role: string;
      establishment_id: string;
    };
    establishment: {
      id: string;
      name: string;
      status: string;
    };
    token: string;
  };
  error?: string;
}

/**
 * Invitation validation result
 */
export interface InvitationValidationResult {
  isValid: boolean;
  token: string;
  establishment?: {
    id: string;
    name: string;
    email: string;
    status: string;
  };
  error?: string;
}

/**
 * Business info validation result
 */
export interface BusinessInfoValidationResult {
  isValid: boolean;
  errors: string[];
  validatedData?: BusinessInfo;
}
