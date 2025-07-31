/**
 * TypeScript Interfaces
 * Centralized interface definitions for the application
 */

// Order-related interfaces
export interface Order {
  id: number;
  total_amount: number;
  total_tax: number;
  payment_method: 'cash' | 'card' | 'split';
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  tips?: number; // Pourboire
  change?: number; // Monnaie rendue
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id?: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  happy_hour_applied: boolean;
  happy_hour_discount_amount: number;
  sub_bill_id?: number;
  description?: string; // Description for special items like Divers
  created_at: Date;
}

export interface SubBill {
  id: number;
  order_id: number;
  payment_method: 'cash' | 'card';
  amount: number;
  status: 'pending' | 'paid';
  created_at: Date;
}

// Product-related interfaces
export interface Category {
  id: number;
  name: string;
  default_tax_rate: number;
  color: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  tax_rate: number;
  category_id: number;
  happy_hour_discount_percent?: number;
  happy_hour_discount_fixed?: number;
  is_happy_hour_eligible: boolean;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

// Business settings interface
export interface BusinessSettings {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  siret: string;
  tax_identification: string;
  updated_at: Date;
}

// User-related interfaces
export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_admin: boolean;
  is_active: boolean;
  email_verified: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

// Legal interfaces
export interface JournalEntry {
  id: number;
  sequence_number: number;
  transaction_type: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE';
  order_id?: number;
  amount: number;
  vat_amount: number;
  payment_method: string;
  transaction_data: any;
  previous_hash: string;
  current_hash: string;
  timestamp: Date;
  user_id?: string;
  register_id: string;
  created_at: Date;
}

export interface ClosureBulletin {
  id: number;
  closure_type: 'DAILY' | 'MONTHLY' | 'ANNUAL';
  period_start: Date;
  period_end: Date;
  total_transactions: number;
  total_amount: number;
  total_vat: number;
  vat_breakdown: any;
  payment_methods_breakdown: any;
  tips_total?: number;
  change_total?: number;
  first_sequence: number;
  last_sequence: number;
  closure_hash: string;
  is_closed: boolean;
  closed_at?: Date;
  created_at: Date;
}

// Archive interfaces
export interface ArchiveExport {
  id: number;
  export_type: 'DAILY' | 'MONTHLY' | 'ANNUAL' | 'FULL';
  period_start: Date;
  period_end: Date;
  file_path: string;
  file_hash: string;
  file_size: number;
  format: 'CSV' | 'XML' | 'PDF' | 'JSON';
  digital_signature: string;
  export_status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'VERIFIED';
  created_by: string;
  created_at: Date;
  verified_at?: Date;
}

export interface ExportData {
  export_type: 'DAILY' | 'MONTHLY' | 'ANNUAL' | 'FULL';
  period_start?: Date;
  period_end?: Date;
  format: 'CSV' | 'XML' | 'PDF' | 'JSON';
  created_by: string;
}

// Audit interfaces
export interface AuditEntry {
  id: number;
  user_id?: string;
  action_type: string;
  resource_type?: string;
  resource_id?: string;
  action_details?: any;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  timestamp: Date;
} 