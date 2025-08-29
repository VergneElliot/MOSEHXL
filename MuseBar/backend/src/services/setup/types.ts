/**
 * Setup Service Types and Interfaces
 * Centralized type definitions for the setup system
 */

/**
 * Invitation validation interface
 */
export interface InvitationValidation {
  isValid: boolean;
  token: string;
  establishment?: {
    id: string;
    name: string;
    email: string;
  };
  expires_at?: Date;
  error?: string;
}

/**
 * Business setup request interface
 */
export interface BusinessSetupRequest {
  // User account information
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
  
  // Business information
  business_name: string;
  contact_email: string;
  phone: string;
  address: string;
  tva_number?: string;
  siret_number?: string;
  
  // Setup metadata
  invitation_token: string;
}

/**
 * Business setup response interface
 */
export interface BusinessSetupResponse {
  success: boolean;
  message?: string;
  user?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    establishment?: {
      id: string;
      name: string;
      status: string;
    };
  };
  token?: string;
}

/**
 * Setup status response interface
 */
export interface SetupStatusResponse {
  completed: boolean;
  redirectUrl?: string;
  error?: string;
}

/**
 * User existence check result
 */
export interface UserExistsResult {
  exists: boolean;
  userId?: number;
  hasEstablishment: boolean;
}

/**
 * Invitation data for setup
 */
export interface InvitationData {
  establishment_id: string;
  establishment_name: string;
  establishment_status?: string;
  invitation_id: string;
  expires_at: Date;
}

/**
 * Setup validation errors
 */
export interface SetupValidationError {
  field: string;
  message: string;
}

/**
 * Setup context for operations
 */
export interface SetupContext {
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  timestamp: Date;
}

/**
 * Default data configuration
 */
export interface DefaultDataConfig {
  categories: Array<{
    name: string;
    description?: string;
    is_active: boolean;
  }>;
  products: Array<{
    name: string;
    description?: string;
    price: number;
    tax_rate: number;
    category_name: string;
    is_active: boolean;
  }>;
  settings: Record<string, any>;
}

/**
 * Database transaction context
 */
export interface TransactionContext {
  client: any; // PoolClient from pg
  transactionId: string;
  startTime: Date;
}

/**
 * Setup step configuration
 */
export interface SetupStep {
  id: string;
  name: string;
  description: string;
  required: boolean;
  completed: boolean;
  order: number;
}

/**
 * Setup wizard state
 */
export interface SetupWizardState {
  currentStep: number;
  totalSteps: number;
  steps: SetupStep[];
  data: Partial<BusinessSetupRequest>;
  errors: SetupValidationError[];
}

/**
 * Setup progress tracking
 */
export interface SetupProgress {
  invitation_validated: boolean;
  user_created: boolean;
  establishment_updated: boolean;
  default_data_created: boolean;
  schema_initialized: boolean;
  audit_logged: boolean;
}

