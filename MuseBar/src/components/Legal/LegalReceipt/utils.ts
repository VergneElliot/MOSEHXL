/**
 * Legal Receipt Utilities
 * Formatting and calculation functions for receipts
 */

import { VatBreakdownItem, ReceiptCalculations, ReceiptFormatting } from './types';

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

/**
 * Format date for receipt display
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Calculate VAT breakdown and totals
 */
export const calculateReceiptTotals = (
  orderAmount: number | string,
  vatBreakdown: VatBreakdownItem[]
): ReceiptCalculations => {
  const validVatBreakdown = Array.isArray(vatBreakdown) ? vatBreakdown : [];
  
  const totalVAT = validVatBreakdown.reduce((sum, v) => {
    return sum + parseFloat(String(v.vat));
  }, 0);
  
  const orderAmountNum = parseFloat(String(orderAmount));
  const sousTotalHT = !isNaN(orderAmountNum) && !isNaN(totalVAT)
    ? orderAmountNum - totalVAT
    : 0;

  return {
    totalVAT,
    sousTotalHT,
    vatBreakdown: validVatBreakdown,
  };
};

/**
 * Get VAT rate with backward compatibility
 */
export const getVatRate = (vatItem: VatBreakdownItem): number => {
  // Support both 'tax_rate' and 'rate' for backend compatibility
  const rateCandidate = (vatItem as any).rate;
  
  if (typeof vatItem.tax_rate === 'number' && !isNaN(vatItem.tax_rate)) {
    return vatItem.tax_rate;
  }
  
  if (typeof rateCandidate === 'number' && !isNaN(rateCandidate)) {
    return rateCandidate;
  }
  
  return 0;
};

/**
 * Get payment method display name
 */
export const getPaymentMethodDisplayName = (paymentMethod: string): string => {
  switch (paymentMethod) {
    case 'card':
      return 'Carte Bancaire';
    case 'cash':
      return 'Espèces';
    case 'split':
      return 'Split';
    default:
      return paymentMethod;
  }
};

/**
 * Print styles for receipts
 */
export const printStyles = `
@media print {
  body * {
    visibility: hidden !important;
  }
  .receipt-print-area,
  .receipt-print-area * {
    visibility: visible !important;
  }
  .receipt-print-area {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 20px !important;
    box-shadow: none !important;
    border: none !important;
  }
  @page {
    size: A4;
    margin: 1cm;
  }
}
`;

/**
 * Export formatting utilities object
 */
export const receiptFormatting: ReceiptFormatting = {
  formatCurrency,
  formatDate,
};

