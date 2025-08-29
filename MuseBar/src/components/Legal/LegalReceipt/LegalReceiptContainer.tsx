/**
 * Legal Receipt Container Component
 * Main orchestrator for the modular receipt system
 */

import React, { useEffect } from 'react';
import { Paper } from '@mui/material';
import { LegalReceiptProps } from './types';
import { ReceiptHeader } from './ReceiptHeader';
import { ReceiptItems } from './ReceiptItems';
import { ReceiptFooter } from './ReceiptFooter';
import { ReceiptSignature } from './ReceiptSignature';
import { calculateReceiptTotals, printStyles } from './utils';

/**
 * Legal Receipt Container Component
 */
export const LegalReceiptContainer: React.FC<LegalReceiptProps> = ({
  order,
  businessInfo,
  receiptType = 'detailed',
}) => {
  // Add print styles to document head
  useEffect(() => {
    const styleId = 'receipt-print-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = printStyles;
      document.head.appendChild(styleElement);
    }
    
    return () => {
      // Cleanup on unmount
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, []);

  // Calculate totals and VAT breakdown
  const { totalVAT, sousTotalHT, vatBreakdown } = calculateReceiptTotals(
    order.total_amount,
    order.vat_breakdown || []
  );

  // Ensure items array exists
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <Paper
      className="receipt-print-area"
      elevation={3}
      sx={{
        p: 3,
        maxWidth: 400,
        mx: 'auto',
        fontFamily: 'monospace',
        fontSize: '0.875rem',
      }}
    >
      {/* Header with business info and receipt details */}
      <ReceiptHeader
        businessInfo={businessInfo}
        order={order}
        receiptType={receiptType}
      />

      {/* Items section - only for detailed receipts */}
      {receiptType === 'detailed' && (
        <ReceiptItems
          items={items}
          showHappyHour={true}
        />
      )}

      {/* Footer with VAT breakdown and totals */}
      <ReceiptFooter
        order={order}
        vatBreakdown={vatBreakdown}
        totalVAT={totalVAT}
        sousTotalHT={sousTotalHT}
        receiptType={receiptType}
      />

      {/* Legal signature and compliance information */}
      <ReceiptSignature
        businessInfo={businessInfo}
        order={order}
      />
    </Paper>
  );
};

export default LegalReceiptContainer;

