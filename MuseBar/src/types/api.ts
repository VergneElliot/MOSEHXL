/**
 * API Response Types
 * Proper TypeScript definitions for all API responses
 */

// Base API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Establishment types
export interface Establishment {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  schema_name: string;
  subscription_plan: 'basic' | 'premium' | 'enterprise';
  subscription_status: 'active' | 'suspended' | 'cancelled';
  created_at: string;
  updated_at: string;
  stats?: {
    totalOrders: number;
    totalRevenue: number;
    activeUsers: number;
    subscriptionStatus: string;
  };
}

export interface CreateEstablishmentData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subscription_plan?: 'basic' | 'premium' | 'enterprise';
}

export interface EstablishmentResponse extends ApiResponse<Establishment> {}
export interface EstablishmentsResponse extends ApiResponse<Establishment[]> {
  count: number;
}

// User invitation types
export interface UserInvitation {
  id: string;
  email: string;
  establishment_id: string;
  establishment_name: string;
  role: string;
  first_name?: string;
  last_name?: string;
  invitation_token: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  created_at: string;
}

export interface InvitationResponse extends ApiResponse<UserInvitation> {}
export interface InvitationsResponse extends ApiResponse<UserInvitation[]> {
  count: number;
}

// User management types
export interface SendInvitationData {
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  establishment_id?: string;
}

export interface SendEstablishmentInvitationData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subscription_plan?: 'basic' | 'premium' | 'enterprise';
}

// Authentication types
export interface LoginResponse extends ApiResponse<{
  token: string;
  user: {
    id: number;
    email: string;
    is_admin: boolean;
  };
  expiresIn: string;
}> {}

export interface UserProfile {
  id: number;
  email: string;
  is_admin: boolean;
  permissions: string[];
}

export interface UserProfileResponse extends ApiResponse<UserProfile> {}

// Generic success/error responses
export interface SuccessResponse extends ApiResponse {
  success: true;
  message: string;
}

export interface ErrorResponse extends ApiResponse {
  success: false;
  error: string;
}

// Closure bulletin types
export interface ClosureBulletin {
  id: number;
  closure_type: 'DAILY' | 'MONTHLY' | 'ANNUAL';
  period_start: string;
  period_end: string;
  total_transactions: number;
  total_amount: number;
  total_vat: number;
  vat_breakdown: {
    vat_10: { amount: number; vat: number };
    vat_20: { amount: number; vat: number };
  };
  payment_methods_breakdown: { [key: string]: number };
  first_sequence: number;
  last_sequence: number;
  closure_hash: string;
  is_closed: boolean;
  closed_at: string | null;
  created_at: string;
  tips_total?: number;
  change_total?: number;
}

// Closure today status
export interface ClosureTodayStatus {
  is_closed: boolean;
  closure_bulletin: ClosureBulletin | null;
  auto_closure_enabled: boolean;
  next_auto_closure: string;
  closure_settings: Record<string, string>;
}

// Closure settings map (settings endpoint returns key-value object)
export type ClosureSettings = Record<string, {
  value: string;
  description?: string;
  updated_by?: string;
  updated_at?: string;
}> | Record<string, string>;

// Live monthly stats
export interface LiveMonthlyStats {
  total_transactions: number;
  total_amount: number;
  total_vat: number;
  tips_total: number;
  change_total: number;
}

// Business info (minimal)
export interface BusinessInfo {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  siret?: string;
  tax_identification?: string;
}

// Union type for all possible API responses
export type ApiResponseType = 
  | EstablishmentResponse
  | EstablishmentsResponse
  | InvitationResponse
  | InvitationsResponse
  | LoginResponse
  | UserProfileResponse
  | SuccessResponse
  | ErrorResponse;
