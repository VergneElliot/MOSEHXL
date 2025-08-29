/**
 * Thermal Print Types and Interfaces
 * Centralized type definitions for the thermal printing system
 */

export interface ReceiptData {
  order_id: number;
  sequence_number: number;
  total_amount: number;
  total_tax: number;
  payment_method: string;
  created_at: string;
  items?: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    tax_rate: number;
  }>;
  business_info: {
    name: string;
    address: string;
    phone: string;
    email: string;
    siret?: string;
    tax_identification?: string;
  };
  vat_breakdown?: Array<{
    rate: number;
    subtotal_ht: number;
    vat: number;
  }>;
  receipt_type: 'detailed' | 'summary';
  tips?: number;
  change?: number;
  compliance_info?: {
    receipt_hash?: string;
    cash_register_id?: string;
    operator_id?: string;
  };
}

export interface ClosureBulletinData {
  id: number;
  closure_type: 'DAILY' | 'MONTHLY' | 'ANNUAL';
  period_start: string;
  period_end: string;
  total_transactions: number;
  total_amount: number;
  total_vat: number;
  business_info: {
    name: string;
    address: string;
    phone: string;
    email: string;
    siret?: string;
    tax_identification?: string;
  };
  transactions_summary: Array<{
    payment_method: string;
    count: number;
    total: number;
  }>;
  vat_summary: Array<{
    rate: number;
    count: number;
    subtotal_ht: number;
    vat: number;
    total_ttc: number;
  }>;
  closure_hash: string;
  created_at: string;
}

export interface PrintJob {
  id: string;
  type: 'receipt' | 'closure';
  data: ReceiptData | ClosureBulletinData;
  priority: 'low' | 'normal' | 'high';
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface PrinterConfig {
  device: string;
  baudRate: number;
  paperWidth: number;
  characterWidth: number;
  timeout: number;
  retryAttempts: number;
}

export interface PrinterStatus {
  isConnected: boolean;
  isReady: boolean;
  paperStatus: 'ok' | 'low' | 'out';
  errorCode?: string;
  lastPrint?: Date;
}

export interface PrintQueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalJobs: number;
}

export interface FormattedContent {
  header: string;
  body: string;
  footer: string;
  commands: string;
}

export type PaymentMethod = 'cash' | 'card' | 'split';
export type ClosureType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
export type ReceiptType = 'detailed' | 'summary';

