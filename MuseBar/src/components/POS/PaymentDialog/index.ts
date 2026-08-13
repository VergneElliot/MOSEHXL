/**
 * Payment Dialog Module - Clean Exports
 * Provides a modular payment system with focused components
 */

export { SplitBoard } from './SplitBoard';
export { ChangeMakingPanel } from './ChangeMakingPanel';

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

