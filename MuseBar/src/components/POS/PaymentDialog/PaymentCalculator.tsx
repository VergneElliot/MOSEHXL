/**
 * Payment Calculator Component
 * Handles amount calculations, tips, and change calculation
 */

import React from 'react';
import {
  Box,
  TextField,
  Grid,
  Typography,
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  Euro as EuroIcon,
  Calculate as CalculateIcon,
} from '@mui/icons-material';
import { PaymentCalculatorProps } from './types';

/**
 * Payment Calculator Component
 */
export const PaymentCalculator: React.FC<PaymentCalculatorProps> = ({
  paymentMethod,
  orderTotal,
  tips,
  onTipsChange,
  cashReceived,
  onCashReceivedChange,
  changeAmount,
  isValid,
  disabled = false,
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const totalWithTips = orderTotal + (parseFloat(tips) || 0);

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle1" gutterBottom>
        <CalculateIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Calculs de paiement
      </Typography>

      {/* Order Summary */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Sous-total commande:
            </Typography>
            <Typography variant="h6">
              {formatCurrency(orderTotal)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Total avec pourboire:
            </Typography>
            <Typography variant="h6" color="primary">
              {formatCurrency(totalWithTips)}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Tips Input */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Pourboire (optionnel)"
            value={tips}
            onChange={(e) => onTipsChange(e.target.value)}
            type="number"
            inputProps={{ step: "0.01", min: "0" }}
            disabled={disabled}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EuroIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            helperText="Montant du pourboire à ajouter"
          />
        </Grid>
      </Grid>

      {/* Cash Payment Specific Fields */}
      {paymentMethod === 'cash' && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, mb: 1 }}>
            Détails paiement espèces
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Montant reçu"
                value={cashReceived}
                onChange={(e) => onCashReceivedChange(e.target.value)}
                type="number"
                inputProps={{ step: "0.01", min: "0" }}
                error={!isValid && cashReceived !== ''}
                disabled={disabled}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EuroIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                helperText={
                  !isValid && cashReceived !== ''
                    ? 'Montant insuffisant'
                    : `Minimum requis: ${formatCurrency(totalWithTips)}`
                }
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Rendu"
                value={formatCurrency(changeAmount)}
                InputProps={{ 
                  readOnly: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <EuroIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
                disabled={disabled}
                sx={{
                  '& .MuiInputBase-input': {
                    fontWeight: 'bold',
                    color: changeAmount > 0 ? 'success.main' : 'text.primary',
                  },
                }}
                helperText="Montant à rendre au client"
              />
            </Grid>
          </Grid>

          {/* Cash Payment Validation */}
          {cashReceived && !isValid && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Le montant reçu ({formatCurrency(parseFloat(cashReceived) || 0)}) est insuffisant.
                <br />
                Montant requis: {formatCurrency(totalWithTips)}
              </Typography>
            </Alert>
          )}

          {changeAmount > 0 && isValid && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Rendu à remettre:</strong> {formatCurrency(changeAmount)}
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      {/* Card Payment Info */}
      {paymentMethod === 'card' && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Paiement par carte:</strong> {formatCurrency(totalWithTips)}
            <br />
            Assurez-vous que la transaction par carte est approuvée avant de valider.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default PaymentCalculator;

