/**
 * Payment Dialog Types and Interfaces
 * Centralized type definitions for the payment system
 */

import { OrderItem, LocalSubBill } from '../../../types';

export interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  currentOrder: OrderItem[];
  orderTotal: number;
  orderTax: number;
  orderSubtotal: number;
  onOrderComplete: (message: string) => void;
  onOrderError: (message: string) => void;
  onDataUpdate: () => void;
  onClearOrder: () => void;
}

export type SimplePaymentMethod = 'card' | 'cash';
export type SplitType = 'equal' | 'custom';

export interface PaymentMethodSelectorProps {
  paymentMethod: SimplePaymentMethod;
  onMethodChange: (method: SimplePaymentMethod) => void;
  disabled?: boolean;
}

export interface PaymentCalculatorProps {
  paymentMethod: SimplePaymentMethod;
  orderTotal: number;
  tips: string;
  onTipsChange: (tips: string) => void;
  cashReceived: string;
  onCashReceivedChange: (amount: string) => void;
  changeAmount: number;
  isValid: boolean;
  disabled?: boolean;
}

export interface PaymentConfirmationProps {
  orderTotal: number;
  tips: string;
  paymentMethod: SimplePaymentMethod;
  cashReceived: string;
  changeAmount: number;
  isValid: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface SplitPaymentProps {
  orderTotal: number;
  currentOrder: OrderItem[];
  splitType: SplitType;
  splitCount: number;
  subBills: LocalSubBill[];
  onSplitTypeChange: (type: SplitType) => void;
  onSplitCountChange: (count: number) => void;
  onSubBillsChange: (bills: LocalSubBill[]) => void;
  onInitialize: () => void;
  loading: boolean;
  onConfirm: () => void;
}

export interface PaymentState {
  tabValue: number;
  simplePaymentMethod: SimplePaymentMethod;
  cashReceived: string;
  tips: string;
  splitType: SplitType;
  splitCount: number;
  subBills: LocalSubBill[];
  loading: boolean;
}

export interface UsePaymentLogicReturn {
  state: PaymentState;
  // Simple payment
  setSimplePaymentMethod: (method: SimplePaymentMethod) => void;
  setCashReceived: (amount: string) => void;
  setTips: (tips: string) => void;
  changeAmount: number;
  isSimplePaymentValid: boolean;
  handleSimplePayment: () => Promise<void>;
  // Split payment
  setSplitType: (type: SplitType) => void;
  setSplitCount: (count: number) => void;
  setSubBills: (bills: LocalSubBill[]) => void;
  initializeSplitBills: () => void;
  handleSplitPayment: () => Promise<void>;
  // Tab management
  setTabValue: (value: number) => void;
  // Form management
  resetForm: () => void;
  formatCurrency: (amount: number) => string;
}

export interface PaymentTabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export interface OrderSummaryProps {
  currentOrder: OrderItem[];
  orderTotal: number;
  orderTax: number;
  orderSubtotal: number;
}

