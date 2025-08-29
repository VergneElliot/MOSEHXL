/**
 * Payment Dialog Module - Clean Exports
 * Provides a modular payment system with focused components
 */

// Core components
export { PaymentMethodSelector } from './PaymentMethodSelector';
export { PaymentCalculator } from './PaymentCalculator';
export { PaymentConfirmation } from './PaymentConfirmation';
export { SplitPayment } from './SplitPayment';

// Hook
export { usePaymentLogic } from './usePaymentLogic';

// Types
export type {
  PaymentDialogProps,
  SimplePaymentMethod,
  SplitType,
  PaymentMethodSelectorProps,
  PaymentCalculatorProps,
  PaymentConfirmationProps,
  SplitPaymentProps,
  PaymentState,
  UsePaymentLogicReturn,
  PaymentTabPanelProps,
  OrderSummaryProps,
} from './types';

// Main container component
export { PaymentDialogContainer } from './PaymentDialogContainer';

// Default export for backward compatibility
export { PaymentDialogContainer as default } from './PaymentDialogContainer';

