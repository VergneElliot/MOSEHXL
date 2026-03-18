import React from 'react';
import {
  Box,
  Typography,
  ListItem,
  ListItemText,
  List,
  IconButton,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CreditCard as CardIcon,
  LocalAtm as CashIcon,
} from '@mui/icons-material';
import { formatCurrency } from '../../../utils/formatCurrency';
import type { LocalSubBill } from '../../../types';
import type { SplitType, SplitMode } from './types';

type SplitRowProps = {
  bill: LocalSubBill;
  index: number;
  splitType: SplitType;
  customSubMode: SplitMode;
  subBillsLength: number;
  onRemoveItem: (billIndex: number, itemId: string) => void;
  onCustomAmountChange: (index: number, raw: string) => void;
  onPaymentMethodChange?: (billId: string, method: 'cash' | 'card') => void;
};

const SplitRow: React.FC<SplitRowProps> = ({
  bill,
  index,
  splitType,
  customSubMode,
  subBillsLength,
  onRemoveItem,
  onCustomAmountChange,
  onPaymentMethodChange,
}) => {
  const method = bill.payments[0]?.method ?? 'card';
  const isLast = index === subBillsLength - 1;

  return (
    <ListItem
      key={bill.id}
      sx={{
        bgcolor: 'grey.50',
        mb: 1,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'grey.300',
        flexWrap: 'wrap',
        display: 'block',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
        <ListItemText
          primary={`Paiement ${index + 1}`}
          secondary={
            <Box sx={{ mt: 0.5 }}>
              {splitType === 'custom' && customSubMode === 'items' ? (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Articles dans ce paiement:
                  </Typography>
                  {bill.items.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Aucun article
                    </Typography>
                  ) : (
                    <List dense disablePadding>
                      {bill.items.map(item => (
                        <ListItem
                          key={item.id}
                          disablePadding
                          secondaryAction={
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => onRemoveItem(index, item.id)}
                              aria-label="Retirer du paiement"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          }
                        >
                          <ListItemText
                            primary={`${item.productName} — ${formatCurrency(item.totalPrice)}`}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                  <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5 }}>
                    Sous-total: {formatCurrency(bill.total)}
                  </Typography>
                </Box>
              ) : splitType === 'custom' ? (
                <TextField
                  label="Montant"
                  type="number"
                  size="small"
                  value={isLast ? bill.total.toFixed(2) : bill.total || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (!isLast) {
                      onCustomAmountChange(index, e.target.value);
                    }
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  sx={{ maxWidth: 140, mb: 1 }}
                  helperText={isLast ? 'Calculé automatiquement' : 'Saisir le montant pour ce payeur'}
                  disabled={splitType !== 'custom' || isLast}
                />
              ) : (
                <Typography variant="body2">
                  Montant: {formatCurrency(bill.total)}
                </Typography>
              )}
              {splitType === 'equal' && (
                <Typography variant="body2" color="textSecondary">
                  Articles: {bill.items.length}
                </Typography>
              )}
            </Box>
          }
        />
        {onPaymentMethodChange && (
          <ToggleButtonGroup
            value={method}
            exclusive
            onChange={(_, value) => value != null && onPaymentMethodChange(bill.id, value)}
            size="small"
            sx={{ ml: 1 }}
            aria-label={`Mode de paiement pour paiement ${index + 1}`}
          >
            <ToggleButton value="cash" aria-label="Espèces">
              <CashIcon sx={{ mr: 0.5 }} fontSize="small" />
              Espèces
            </ToggleButton>
            <ToggleButton value="card" aria-label="Carte">
              <CardIcon sx={{ mr: 0.5 }} fontSize="small" />
              Carte
            </ToggleButton>
          </ToggleButtonGroup>
        )}
        <Chip
          label={bill.payments.length > 0 ? 'Configuré' : 'En attente'}
          color={bill.payments.length > 0 ? 'success' : 'default'}
          size="small"
          sx={{ ml: 1 }}
        />
      </Box>
    </ListItem>
  );
};

export default SplitRow;

