/**
 * TypeScript Interfaces
 * Centralized interface definitions for the application
 */

import type {
  Order as SharedOrder,
  OrderItem as SharedOrderItem,
  SubBill as SharedSubBill,
} from '@mosehxl/types';

// Order-related interfaces
export type Order = SharedOrder;
export type OrderItem = SharedOrderItem;
export type SubBill = SharedSubBill;

// Product-related interfaces
export interface Category {
  id: number;
  establishment_id: string | null;
  name: string;
  default_tax_rate: number;
  color: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: number;
  establishment_id: string | null;
  name: string;
  price: number;
  tax_rate: number;
  category_id: number;
  happy_hour_discount_percent?: number;
  happy_hour_discount_fixed?: number;
  is_happy_hour_eligible: boolean;
  print_pickup_slip?: boolean;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

// Business settings interface
export interface BusinessSettings {
  id: number;
  establishment_id: string | null;
  name: string;
  address: string;
  phone: string;
  email: string;
  siret: string;
  tax_identification: string;
  updated_at: Date;
}

// User types — single source of truth is models/user.ts
export type { UserRow, AuthenticatedUser } from '../user';

// Legal interfaces
export interface JournalEntry {
  id: number;
  sequence_number: number;
  transaction_type: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE' | 'CHANGE';
  order_id?: number;
  amount: number;
  vat_amount: number;
  payment_method: string;
  transaction_data: Record<string, unknown>;
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
  vat_breakdown: Array<{ rate: number; subtotal_ht: number; vat: number }> | Record<string, number>;
  payment_methods_breakdown: Record<string, number>;
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
  action_details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  timestamp: Date;
} 