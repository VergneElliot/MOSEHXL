/**
 * Legal Receipt Module - Clean Exports
 * Provides a modular receipt system with focused components
 */

// Core components
export { ReceiptHeader } from './ReceiptHeader';
export { ReceiptItems } from './ReceiptItems';
export { ReceiptFooter } from './ReceiptFooter';
export { ReceiptSignature } from './ReceiptSignature';

// Utilities
export {
  formatCurrency,
  formatDate,
  calculateReceiptTotals,
  getVatRate,
  getPaymentMethodDisplayName,
  printStyles,
  receiptFormatting,
} from './utils';

// Types
export type {
  ReceiptItem,
  VatBreakdownItem,
  BusinessInfo,
  Order,
  LegalReceiptProps,
  ReceiptHeaderProps,
  ReceiptItemsProps,
  ReceiptFooterProps,
  ReceiptSignatureProps,
  ReceiptCalculations,
  ReceiptFormatting,
} from './types';

// Main container component
export { LegalReceiptContainer } from './LegalReceiptContainer';

// Default export for backward compatibility
export { LegalReceiptContainer as default } from './LegalReceiptContainer';

