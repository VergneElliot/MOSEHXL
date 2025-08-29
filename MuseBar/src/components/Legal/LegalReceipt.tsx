/**
 * Legal Receipt Component
 * REFACTORED: This component has been modularized into smaller, focused modules.
 * The original 489-line monolithic component has been broken down into:
 * - ReceiptHeader.tsx (Business info and receipt details)
 * - ReceiptItems.tsx (Items listing)
 * - ReceiptFooter.tsx (VAT breakdown and totals)
 * - ReceiptSignature.tsx (Legal signature section)
 * - LegalReceiptContainer.tsx (Main orchestrator)
 * - utils.ts (Formatting and calculation utilities)
 * - types.ts (Type definitions)
 */

// Re-export the modular receipt system for backward compatibility
export {
  LegalReceiptContainer as LegalReceipt,
  ReceiptHeader,
  ReceiptItems,
  ReceiptFooter,
  ReceiptSignature,
  // Utilities
  formatCurrency,
  formatDate,
  calculateReceiptTotals,
  // Types
  type LegalReceiptProps,
  type ReceiptItem,
  type BusinessInfo,
  type Order,
} from './LegalReceipt/index';

// Default export for backward compatibility
export { default } from './LegalReceipt/index';