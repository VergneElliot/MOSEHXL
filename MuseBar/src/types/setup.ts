/**
 * Types for business setup wizard
 */

export interface InvitationValidation {
  isValid: boolean;
  token: string;
  establishment?: {
    id: string;
    name: string;
    email: string;
  };
  expires_at?: string;
  error?: string;
}

export interface BusinessSetupRequest {
  // User account information
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;

  // Business information (update existing establishment)
  business_name: string;
  contact_email: string;
  phone: string;
  address: string;
  tva_number?: string;
  siret_number?: string;
  
  // Setup metadata
  invitation_token: string;
}

export interface BusinessSetupResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  establishment?: {
    id: string;
    name: string;
    status: string;
  };
  token?: string;
}

export interface SetupFormData {
  // Personal information
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;

  // Business information
  businessName: string;
  contactEmail: string;
  phone: string;
  address: string;
  tvaNumber: string;
  siretNumber: string;
}

export interface SetupStep {
  id: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
}