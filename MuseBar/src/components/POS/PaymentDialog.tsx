/**
 * Payment Dialog Component
 * REFACTORED: This component has been modularized into smaller, focused modules.
 * The original 481-line monolithic component has been broken down into:
 * - PaymentMethodSelector.tsx (Method selection)
 * - PaymentCalculator.tsx (Amount calculations)
 * - PaymentConfirmation.tsx (Confirmation UI)
 * - SplitPayment.tsx (Split payment handling)
 * - usePaymentLogic.ts (Payment processing logic)
 * - PaymentDialogContainer.tsx (Main orchestrator)
 * - types.ts (Type definitions)
 */

// Re-export the modular payment system for backward compatibility
export {
  PaymentDialogContainer as PaymentDialog,
  PaymentMethodSelector,
  PaymentCalculator,
  PaymentConfirmation,
  SplitPayment,
  usePaymentLogic,
  // Types
  type PaymentDialogProps,
  type SimplePaymentMethod,
  type SplitType,
} from './PaymentDialog/index';

// Default export for backward compatibility
export { default } from './PaymentDialog/index';