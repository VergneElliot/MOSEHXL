/**
 * Payment Method Selector Component
 * Handles the selection of payment methods (cash, card)
 */

import React from 'react';
import {
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
} from '@mui/material';
import {
  CreditCard as CardIcon,
  LocalAtm as CashIcon,
} from '@mui/icons-material';
import { PaymentMethodSelectorProps } from './types';

/**
 * Payment Method Selector Component
 */
export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  paymentMethod,
  onMethodChange,
  disabled = false,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onMethodChange(event.target.value as 'card' | 'cash');
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Mode de paiement
      </Typography>
      
      <RadioGroup
        value={paymentMethod}
        onChange={handleChange}
        sx={{ mt: 1 }}
      >
        <FormControlLabel
          value="card"
          control={<Radio disabled={disabled} />}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CardIcon color="primary" />
              <Box>
                <Typography variant="body1">Carte Bancaire</Typography>
                <Typography variant="caption" color="text.secondary">
                  Paiement par carte de crédit ou débit
                </Typography>
              </Box>
            </Box>
          }
          disabled={disabled}
        />
        
        <FormControlLabel
          value="cash"
          control={<Radio disabled={disabled} />}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CashIcon color="success" />
              <Box>
                <Typography variant="body1">Espèces</Typography>
                <Typography variant="caption" color="text.secondary">
                  Paiement en liquide avec calcul de rendu
                </Typography>
              </Box>
            </Box>
          }
          disabled={disabled}
        />
      </RadioGroup>
    </Box>
  );
};

export default PaymentMethodSelector;

