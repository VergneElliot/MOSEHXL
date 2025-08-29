/**
 * Payment Confirmation Component
 * Final confirmation screen with payment summary and actions
 */

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  Grid,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Check as CheckIcon,
  Cancel as CancelIcon,
  CreditCard as CardIcon,
  LocalAtm as CashIcon,
} from '@mui/icons-material';
import { PaymentConfirmationProps } from './types';

/**
 * Payment Confirmation Component
 */
export const PaymentConfirmation: React.FC<PaymentConfirmationProps> = ({
  orderTotal,
  tips,
  paymentMethod,
  cashReceived,
  changeAmount,
  isValid,
  loading,
  onConfirm,
  onCancel,
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const totalWithTips = orderTotal + (parseFloat(tips) || 0);
  const tipsAmount = parseFloat(tips) || 0;

  const getPaymentMethodIcon = () => {
    return paymentMethod === 'card' ? (
      <CardIcon color="primary" fontSize="large" />
    ) : (
      <CashIcon color="success" fontSize="large" />
    );
  };

  const getPaymentMethodText = () => {
    return paymentMethod === 'card' ? 'Carte Bancaire' : 'Espèces';
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PaymentIcon />
        Confirmation de paiement
      </Typography>

      {/* Payment Summary Card */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            {getPaymentMethodIcon()}
            <Box>
              <Typography variant="h6">
                {getPaymentMethodText()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mode de paiement sélectionné
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            {/* Order Amount */}
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Montant commande:
              </Typography>
              <Typography variant="h6">
                {formatCurrency(orderTotal)}
              </Typography>
            </Grid>

            {/* Tips */}
            {tipsAmount > 0 && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Pourboire:
                </Typography>
                <Typography variant="h6" color="success.main">
                  {formatCurrency(tipsAmount)}
                </Typography>
              </Grid>
            )}

            {/* Total */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Total à payer:
              </Typography>
              <Typography variant="h5" color="primary" fontWeight="bold">
                {formatCurrency(totalWithTips)}
              </Typography>
            </Grid>

            {/* Cash Payment Details */}
            {paymentMethod === 'cash' && (
              <>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Montant reçu:
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(parseFloat(cashReceived) || 0)}
                  </Typography>
                </Grid>
                
                {changeAmount > 0 && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Rendu à remettre:
                    </Typography>
                    <Typography variant="h6" color="warning.main" fontWeight="bold">
                      {formatCurrency(changeAmount)}
                    </Typography>
                  </Grid>
                )}
              </>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Validation Alerts */}
      {!isValid && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Paiement invalide:</strong><br />
            {paymentMethod === 'cash' && 'Le montant reçu est insuffisant.'}
            {paymentMethod === 'card' && 'Vérifiez que la transaction par carte est approuvée.'}
          </Typography>
        </Alert>
      )}

      {isValid && paymentMethod === 'cash' && changeAmount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Attention:</strong> N'oubliez pas de remettre le rendu de {formatCurrency(changeAmount)} au client.
          </Typography>
        </Alert>
      )}

      {isValid && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Paiement prêt à être traité:</strong><br />
            Cliquez sur "Confirmer le paiement" pour finaliser la transaction.
          </Typography>
        </Alert>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={<CancelIcon />}
          onClick={onCancel}
          disabled={loading}
          size="large"
        >
          Annuler
        </Button>
        
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
          onClick={onConfirm}
          disabled={!isValid || loading}
          size="large"
          color="primary"
        >
          {loading ? 'Traitement...' : 'Confirmer le paiement'}
        </Button>
      </Box>

      {/* Processing State */}
      {loading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Traitement du paiement en cours... Veuillez patienter.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default PaymentConfirmation;

