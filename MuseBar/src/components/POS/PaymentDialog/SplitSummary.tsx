import React from 'react';
import {
  Box,
  Typography,
  List,
  Grid,
} from '@mui/material';
import { Calculate as CalculateIcon } from '@mui/icons-material';
import { formatCurrency } from '../../../utils/formatCurrency';
import type { LocalSubBill } from '../../../types';
import type { SplitType, SplitMode } from './types';
import SplitRow from './SplitRow';

type SplitSummaryProps = {
  splitType: SplitType;
  customSubMode: SplitMode;
  subBills: LocalSubBill[];
  totalSplit: number;
  orderTotal: number;
  onSubBillPaymentMethodChange?: (billId: string, method: 'cash' | 'card') => void;
  handleCustomAmountChange: (index: number, raw: string) => void;
  removeItemFromBill: (billIndex: number, itemId: string) => void;
};

const SplitSummary: React.FC<SplitSummaryProps> = ({
  splitType,
  customSubMode,
  subBills,
  totalSplit,
  orderTotal,
  onSubBillPaymentMethodChange,
  handleCustomAmountChange,
  removeItemFromBill,
}) => {
  const isValidSplit = Math.round(totalSplit * 100) === Math.round(orderTotal * 100);

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CalculateIcon />
        Détails des paiements
      </Typography>

      <List>
        {subBills.map((bill, index) => (
          <SplitRow
            key={bill.id}
            bill={bill}
            index={index}
            splitType={splitType}
            customSubMode={customSubMode}
            subBillsLength={subBills.length}
            onRemoveItem={removeItemFromBill}
            onCustomAmountChange={handleCustomAmountChange}
            onPaymentMethodChange={onSubBillPaymentMethodChange}
          />
        ))}
      </List>

      <Box sx={{ mt: 2, p: 2, bgcolor: isValidSplit ? 'success.light' : 'error.light', borderRadius: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2">
              <strong>Total partagé:</strong> {formatCurrency(totalSplit)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2">
              <strong>Montant commande:</strong> {formatCurrency(orderTotal)}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography
              variant="body2"
              color={isValidSplit ? 'success.main' : 'error.main'}
              fontWeight="bold"
            >
              <strong>Différence:</strong> {formatCurrency(Math.abs(totalSplit - orderTotal))}
              {isValidSplit ? ' ✓ Valide' : ' ✗ Invalide'}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default SplitSummary;

