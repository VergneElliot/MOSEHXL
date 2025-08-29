/**
 * Legal Receipt Types and Interfaces
 * Centralized type definitions for the receipt system
 */

export interface ReceiptItem {
  name: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  happy_hour_applied: boolean;
  happy_hour_discount_amount: number;
  description?: string;
}

export interface VatBreakdownItem {
  tax_rate: number;
  vat: number | string;
  subtotal_ht: number | string;
  rate?: number; // For backend compatibility
}

export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxIdentification: string;
  siret: string;
}

export interface Order {
  id: number;
  sequence_number: number;
  total_amount: number | string;
  total_tax: number | string;
  payment_method: string;
  created_at: string;
  items: ReceiptItem[];
  vat_breakdown?: VatBreakdownItem[];
}

export interface LegalReceiptProps {
  order: Order;
  businessInfo: BusinessInfo;
  receiptType?: 'detailed' | 'summary';
}

export interface ReceiptHeaderProps {
  businessInfo: BusinessInfo;
  order: Order;
  receiptType?: 'detailed' | 'summary';
}

export interface ReceiptItemsProps {
  items: ReceiptItem[];
  showHappyHour?: boolean;
}

export interface ReceiptFooterProps {
  order: Order;
  vatBreakdown: VatBreakdownItem[];
  totalVAT: number;
  sousTotalHT: number;
  receiptType?: 'detailed' | 'summary';
}

export interface ReceiptSignatureProps {
  businessInfo: BusinessInfo;
  order: Order;
}

/**
 * Utility types for receipt calculations
 */
export interface ReceiptCalculations {
  totalVAT: number;
  sousTotalHT: number;
  vatBreakdown: VatBreakdownItem[];
}

/**
 * Receipt formatting utilities
 */
export interface ReceiptFormatting {
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
}

