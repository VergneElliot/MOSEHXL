import React from 'react';
import {
  Box,
  Chip,
  List,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  CreditCard as CardIcon,
  LocalAtm as CashIcon,
} from '@mui/icons-material';
import type { LocalSubBill } from '../../../types';
import { formatCurrency } from '../../../utils/formatCurrency';
import { billMethod, billTotalFromItems, sourceItemId } from './splitBillCore';
import { billManualDisplay } from './splitBillTotals';
import { selectOnFocus } from './selectOnFocus';
import { SplitBillDropPaper } from './SplitBillDropPaper';
import { SplitBillItemRow } from './SplitBillItemRow';

interface SplitBillCardProps {
  bill: LocalSubBill;
  index: number;
  isDrop: boolean;
  isResidual: boolean;
  onAssignIds: (ids: string[], billIndex: number) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent) => void;
  onAmountChange: (raw: string) => void;
  onPaymentMethodChange: (method: 'cash' | 'card') => void;
  onReturnItemToPool: (sourceId: string) => void;
}

const SplitBillCard: React.FC<SplitBillCardProps> = ({
  bill,
  index,
  isDrop,
  isResidual,
  onAssignIds,
  onDragOver,
  onDragLeave,
  onDrop,
  onAmountChange,
  onPaymentMethodChange,
  onReturnItemToPool,
}) => {
  const method = billMethod(bill);
  const itemSum = billTotalFromItems(bill.items);
  const manualValue = billManualDisplay(bill, isResidual);
  const amountDisplay =
    isResidual || bill.manualAmount != null
      ? String(Number.isInteger(manualValue) ? manualValue : manualValue.toFixed(2))
      : '';

  return (
    <SplitBillDropPaper
      billIndex={index}
      onAssignIds={onAssignIds}
      variant="outlined"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      sx={{
        p: 1.25,
        borderColor: isDrop ? 'primary.main' : isResidual ? 'info.light' : 'divider',
        borderWidth: isDrop ? 2 : 1,
        bgcolor: isDrop ? 'action.hover' : 'grey.50',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1,
          flexWrap: 'wrap',
        }}
      >
        <Typography fontWeight={700} sx={{ mr: 0.5 }}>
          Paiement {index + 1}
        </Typography>
        {isResidual && (
          <Chip size="small" color="info" label="Solde auto" variant="outlined" />
        )}
        <TextField
          size="small"
          label="Montant"
          type="number"
          value={amountDisplay}
          onChange={e => onAmountChange(e.target.value)}
          onFocus={selectOnFocus}
          inputProps={{ min: 0, step: 0.01 }}
          sx={{ width: 120 }}
          InputProps={{
            endAdornment: (
              <Typography variant="caption" color="text.secondary">
                €
              </Typography>
            ),
          }}
        />
        <Box sx={{ flex: 1 }} />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={method}
          onChange={(_, v) => v && onPaymentMethodChange(v)}
        >
          <ToggleButton
            value="cash"
            sx={{
              px: 1.25,
              fontWeight: 700,
              color: 'text.secondary',
              borderColor: 'divider',
              '&.Mui-selected': {
                bgcolor: 'success.main',
                color: 'success.contrastText',
                borderColor: 'success.dark',
                '&:hover': { bgcolor: 'success.dark' },
              },
            }}
          >
            <CashIcon fontSize="small" sx={{ mr: 0.5 }} />
            Espèces
          </ToggleButton>
          <ToggleButton
            value="card"
            sx={{
              px: 1.25,
              fontWeight: 700,
              color: 'text.secondary',
              borderColor: 'divider',
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderColor: 'primary.dark',
                '&:hover': { bgcolor: 'primary.dark' },
              },
            }}
          >
            <CardIcon fontSize="small" sx={{ mr: 0.5 }} />
            Carte
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {bill.items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Déposez des articles ici
        </Typography>
      ) : (
        <List dense disablePadding>
          {bill.items.map(item => (
            <SplitBillItemRow
              key={item.id}
              item={item}
              formatCurrency={formatCurrency}
              onReturnToPool={() => onReturnItemToPool(sourceItemId(item.id))}
            />
          ))}
        </List>
      )}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          mt: 1,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {itemSum > 0
            ? `Articles ${formatCurrency(itemSum)} + complément ${formatCurrency(manualValue)} = ${formatCurrency(bill.total)}`
            : isResidual
              ? 'Reste calculé automatiquement'
              : 'Complément manuel (optionnel)'}
        </Typography>
        <Chip size="small" label={formatCurrency(bill.total)} color="primary" />
      </Box>
    </SplitBillDropPaper>
  );
};

export default SplitBillCard;
