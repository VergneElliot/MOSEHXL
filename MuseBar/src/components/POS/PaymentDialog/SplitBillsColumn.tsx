import React from 'react';
import { Paper, Typography } from '@mui/material';
import type { LocalSubBill } from '../../../types';
import { residualBillIndex } from './splitBillTotals';
import SplitBillCard from './SplitBillCard';

interface SplitBillsColumnProps {
  subBills: LocalSubBill[];
  dropTarget: number | null;
  onAssignIds: (ids: string[], billIndex: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDragLeave: (index: number) => void;
  onDrop: (event: React.DragEvent, index: number) => void;
  onAmountChange: (billIndex: number, raw: string) => void;
  onPaymentMethodChange: (billId: string, method: 'cash' | 'card') => void;
  onReturnItemToPool: (sourceId: string) => void;
}

const SplitBillsColumn: React.FC<SplitBillsColumnProps> = ({
  subBills,
  dropTarget,
  onAssignIds,
  onDragOver,
  onDragLeave,
  onDrop,
  onAmountChange,
  onPaymentMethodChange,
  onReturnItemToPool,
}) => {
  const residualIndex = residualBillIndex(subBills);

  return (
    <Paper
      variant="outlined"
      sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, overflow: 'auto' }}
    >
      <Typography variant="subtitle1" fontWeight={700}>
        Paiements
      </Typography>
      {subBills.map((bill, index) => (
        <SplitBillCard
          key={bill.id}
          bill={bill}
          index={index}
          isDrop={dropTarget === index}
          isResidual={residualIndex === index}
          onAssignIds={onAssignIds}
          onDragOver={e => onDragOver(e, index)}
          onDragLeave={() => onDragLeave(index)}
          onDrop={e => onDrop(e, index)}
          onAmountChange={raw => onAmountChange(index, raw)}
          onPaymentMethodChange={method => onPaymentMethodChange(bill.id, method)}
          onReturnItemToPool={onReturnItemToPool}
        />
      ))}
    </Paper>
  );
};

export default SplitBillsColumn;
