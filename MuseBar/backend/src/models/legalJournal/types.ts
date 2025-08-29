/**
 * Legal Journal Types and Interfaces
 * Type definitions for French legal compliance system
 */

export interface JournalEntry {
  id: number;
  sequence_number: number;
  transaction_type: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE';
  order_id?: number;
  amount: number;
  vat_amount: number;
  payment_method: string;
  transaction_data: Record<string, unknown>; // Complete transaction details
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
  vat_breakdown: Record<string, { amount: number; vat: number }>;
  payment_methods_breakdown: Record<string, number>;
  tips_total?: number; // Total pourboires
  change_total?: number; // Total monnaie rendue
  first_sequence: number;
  last_sequence: number;
  closure_hash: string;
  is_closed: boolean;
  closed_at?: Date;
  created_at: Date;
}

export interface IntegrityCheckResult {
  isValid: boolean;
  errors: string[];
}

export interface VATBreakdown extends Record<string, { amount: number; vat: number }> {
  vat_10: { amount: number; vat: number };
  vat_20: { amount: number; vat: number };
}

export interface PaymentBreakdown {
  [method: string]: number;
}

export interface OrderForJournal {
  id: number;
  total_amount?: number | string;
  total_tax?: number | string;
  taxAmount?: number | string;
  payment_method?: string;
  items?: unknown[];
  created_at?: Date;
  tips?: string;
  change?: string;
}

export type ClosureType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
