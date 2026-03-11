/**
 * Payment Validation
 * Handles validation logic for different payment scenarios
 */

import { useMemo } from 'react';
import { PaymentState } from '../types';

interface UsePaymentValidationProps {
  state: PaymentState;
  totalWithTips: number;
  isSplitAmountValid: boolean;
}

export const usePaymentValidation = ({
  state,
  totalWithTips,
  isSplitAmountValid,
}: UsePaymentValidationProps) => {

  /**
   * Validate simple payment form
   * For cash: Montant reçu is optional; if provided it must be >= total.
   */
  const isSimplePaymentValid = useMemo(() => {
    if (state.simplePaymentMethod === 'cash') {
      if (!state.cashReceived || state.cashReceived.trim() === '') return true;
      const received = parseFloat(state.cashReceived) || 0;
      return received >= totalWithTips;
    }
    return true; // Card payments are always valid if amount > 0
  }, [state.simplePaymentMethod, state.cashReceived, totalWithTips]);

  /**
   * Validate split payment form
   */
  const isSplitPaymentValid = useMemo(() => {
    if (state.subBills.length === 0) return false;
    
    // Check if all sub-bills have valid amounts
    const hasValidAmounts = state.subBills.every(bill => {
      const amount = bill.total || 0;
      return amount > 0;
    });
    
    // Check if total matches
    return hasValidAmounts && isSplitAmountValid;
  }, [state.subBills, isSplitAmountValid]);

  /**
   * Get validation error message for simple payment
   * Only show when cash and user entered an insufficient amount.
   */
  const simplePaymentError = useMemo(() => {
    if (state.simplePaymentMethod === 'cash' && state.cashReceived && state.cashReceived.trim() !== '') {
      const received = parseFloat(state.cashReceived) || 0;
      if (received < totalWithTips) {
        const shortfall = totalWithTips - received;
        return `Montant insuffisant. Il manque ${shortfall.toFixed(2)} €`;
      }
    }
    return null;
  }, [state.simplePaymentMethod, state.cashReceived, totalWithTips]);

  /**
   * Get validation error message for split payment
   */
  const splitPaymentError = useMemo(() => {
    if (state.subBills.length === 0) {
      return 'Aucune facture divisée configurée';
    }
    
    const invalidBills = state.subBills.filter(bill => (bill.total || 0) <= 0);
    if (invalidBills.length > 0) {
      return `${invalidBills.length} facture(s) ont un montant invalide`;
    }
    
    if (!isSplitAmountValid) {
      return 'Le total des factures divisées ne correspond pas au montant total';
    }
    
    return null;
  }, [state.subBills, isSplitAmountValid]);

  /**
   * Validate tips amount
   */
  const isTipsValid = useMemo(() => {
    if (!state.tips) return true;
    const tips = parseFloat(state.tips);
    return !isNaN(tips) && tips >= 0;
  }, [state.tips]);

  /**
   * Validate cash received amount (when provided)
   * Empty is allowed for fast cash payment without change calculation.
   */
  const isCashReceivedValid = useMemo(() => {
    if (state.simplePaymentMethod !== 'cash') return true;
    if (!state.cashReceived || state.cashReceived.trim() === '') return true;
    const received = parseFloat(state.cashReceived);
    return !isNaN(received) && received >= 0;
  }, [state.simplePaymentMethod, state.cashReceived]);

  /**
   * Check if any payment method is available
   */
  const hasValidPaymentMethod = useMemo(() => {
    return state.tabValue === 0 ? isSimplePaymentValid : isSplitPaymentValid;
  }, [state.tabValue, isSimplePaymentValid, isSplitPaymentValid]);

  return {
    isSimplePaymentValid,
    isSplitPaymentValid,
    simplePaymentError,
    splitPaymentError,
    isTipsValid,
    isCashReceivedValid,
    hasValidPaymentMethod,
  };
};
