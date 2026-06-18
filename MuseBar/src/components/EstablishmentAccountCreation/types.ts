/**
 * TypeScript interfaces for Establishment Account Creation
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

export interface EstablishmentAccountCreationRequest {
  token: string;
  password: string;
  businessInfo: BusinessInfo;
}

export interface EstablishmentAccountCreationResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  establishment?: {
    id: string;
    name: string;
    status: string;
  };
  token?: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface InvitationValidationResult {
  isValid: boolean;
  error?: string;
  invitation?: {
    id: string;
    establishmentId: string;
    email: string;
    expiresAt: string | Date;
  };
}

export interface BusinessInfoValidationResult {
  isValid: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

export interface AccountCreationStepData {
  password: string;
}

export interface BusinessInfoStepData {
  businessInfo: BusinessInfo;
}

export type SetupStepPayload = AccountCreationStepData | BusinessInfoStepData;

export interface SetupStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
}

export interface SetupState {
  currentStep: number;
  steps: SetupStep[];
  invitationData: InvitationValidationResult | null;
  businessInfo: BusinessInfo | null;
  password: string;
  isLoading: boolean;
  error: string | null;
  isCompleted: boolean;
  successMessage: string | null;
}

export interface SetupActions {
  setCurrentStep: (step: number) => void;
  setInvitationData: (data: InvitationValidationResult) => void;
  setBusinessInfo: (info: BusinessInfo) => void;
  setPassword: (password: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  completeStep: (stepId: number) => void;
  setCompleted: (completed: boolean) => void;
  setSuccessMessage: (message: string | null) => void;
  resetSetup: () => void;
}
