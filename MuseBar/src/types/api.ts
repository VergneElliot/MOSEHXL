// API request and response types

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface ApiError {
  error: string;
  details?: string;
  code?: string | number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  siret: string;
  tax_identification: string;
}

export interface LegalComplianceStatus {
  compliance_status: {
    journal_integrity: string;
    integrity_errors: string[];
    last_closure: string | null;
    certification_required_by: string;
    certification_bodies: string[];
    fine_risk: string;
  };
  journal_statistics: {
    total_entries: number;
    sale_transactions: number;
    first_entry: string | null;
    last_entry: string | null;
  };
  isca_pillars: {
    inaltérabilité: string;
    sécurisation: string;
    conservation: string;
    archivage: string;
  };
  legal_reference: string;
  checked_at: string;
}

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

// HTTP method types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Common API endpoint patterns
export interface ApiEndpoints {
  auth: {
    login: string;
    logout: string;
    me: string;
    refresh: string;
  };
  business: {
    categories: string;
    products: string;
    orders: string;
  };
  legal: {
    compliance: string;
    closures: string;
    journal: string;
  };
} 