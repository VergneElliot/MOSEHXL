/**
 * Payment Method Selector Component
 * Handles payment method selection and basic payment processing
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Grid,
  Alert,
  Card,
  CardContent,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  CreditCard as CardIcon,
  LocalAtm as CashIcon,
} from '@mui/icons-material';
import LoadingButton from '../common/LoadingButton';

interface PaymentMethodSelectorProps {
  orderTotal: number;
  orderTax: number;
  orderSubtotal: number;
  onPaymentComplete: (paymentData: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  orderTotal,
  orderTax,
  orderSubtotal,
  onPaymentComplete,
  onCancel,
  loading = false,
}) => {
  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('card');
  const [cashReceived, setCashReceived] = useState('');
  const [tips, setTips] = useState('');

  // Currency formatter
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }, []);

  // Calculate change
  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const tipsNum = parseFloat(tips) || 0;
  const change = cashReceivedNum - orderTotal - tipsNum;

  const handlePayment = () => {
    const paymentData = {
      method: paymentMethod,
      total: orderTotal,
      tax: orderTax,
      subtotal: orderSubtotal,
      tips: tipsNum,
      change: change,
      cashReceived: cashReceivedNum,
    };
    onPaymentComplete(paymentData);
  };

  const isPaymentValid = () => {
    if (paymentMethod === 'cash') {
      return cashReceivedNum >= orderTotal;
    }
    return true;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Payment Method
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Order Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Subtotal
              </Typography>
              <Typography variant="h6">
                {formatCurrency(orderSubtotal)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Tax
              </Typography>
              <Typography variant="h6">
                {formatCurrency(orderTax)}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h5" color="primary">
                Total: {formatCurrency(orderTotal)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <RadioGroup
        value={paymentMethod}
        onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card')}
        sx={{ mb: 3 }}
      >
        <FormControlLabel
          value="card"
          control={<Radio />}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CardIcon sx={{ mr: 1 }} />
              <Typography>Card Payment</Typography>
            </Box>
          }
        />
        <FormControlLabel
          value="cash"
          control={<Radio />}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CashIcon sx={{ mr: 1 }} />
              <Typography>Cash Payment</Typography>
            </Box>
          }
        />
      </RadioGroup>

      {paymentMethod === 'cash' && (
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cash Received"
                type="number"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PaymentIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="0.00"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tips"
                type="number"
                value={tips}
                onChange={(e) => setTips(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PaymentIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="0.00"
              />
            </Grid>
          </Grid>

          {cashReceivedNum > 0 && (
            <Alert severity={change >= 0 ? 'success' : 'error'} sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Change:</strong> {formatCurrency(Math.abs(change))}
                {change < 0 && ' (Insufficient cash)'}
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <LoadingButton
          variant="outlined"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </LoadingButton>
        <LoadingButton
          variant="contained"
          onClick={handlePayment}
          loading={loading}
          disabled={!isPaymentValid()}
          startIcon={<PaymentIcon />}
        >
          Complete Payment
        </LoadingButton>
      </Box>
    </Box>
  );
};

export default PaymentMethodSelector; 