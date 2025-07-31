/**
 * Split Payment Form Component
 * Handles split payment configuration and processing
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Alert,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Calculate as CalculateIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { LoadingButton } from '../common/LoadingStates';

interface LocalSubBill {
  id: string;
  paymentMethod: 'cash' | 'card';
  amount: number;
  status: 'pending' | 'paid';
}

interface SplitPaymentFormProps {
  orderTotal: number;
  orderTax: number;
  orderSubtotal: number;
  onSplitComplete: (subBills: LocalSubBill[]) => void;
  onCancel: () => void;
  loading?: boolean;
}

const SplitPaymentForm: React.FC<SplitPaymentFormProps> = ({
  orderTotal,
  orderTax,
  orderSubtotal,
  onSplitComplete,
  onCancel,
  loading = false,
}) => {
  // Split payment states
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [splitCount, setSplitCount] = useState(2);
  const [subBills, setSubBills] = useState<LocalSubBill[]>([]);

  // Currency formatter
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }, []);

  // Calculate equal split
  const equalAmount = orderTotal / splitCount;
  const remainingAmount = orderTotal - (Math.floor(equalAmount * 100) / 100) * splitCount;

  // Generate sub-bills based on split type
  useEffect(() => {
    if (splitType === 'equal') {
      const bills: LocalSubBill[] = [];
      for (let i = 0; i < splitCount; i++) {
        const amount = i === 0 
          ? equalAmount + remainingAmount 
          : equalAmount;
        bills.push({
          id: `bill-${i}`,
          paymentMethod: 'card',
          amount: Math.round(amount * 100) / 100,
          status: 'pending',
        });
      }
      setSubBills(bills);
    }
  }, [splitType, splitCount, orderTotal, equalAmount, remainingAmount]);

  const handleSubBillChange = (id: string, field: keyof LocalSubBill, value: any) => {
    setSubBills(prev => prev.map(bill => 
      bill.id === id ? { ...bill, [field]: value } : bill
    ));
  };

  const handleSplitComplete = () => {
    onSplitComplete(subBills);
  };

  const isSplitValid = () => {
    const totalAmount = subBills.reduce((sum, bill) => sum + bill.amount, 0);
    return Math.abs(totalAmount - orderTotal) < 0.01;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Split Payment Configuration
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
        value={splitType}
        onChange={(e) => setSplitType(e.target.value as 'equal' | 'custom')}
        sx={{ mb: 3 }}
      >
        <FormControlLabel
          value="equal"
          control={<Radio />}
          label="Equal Split"
        />
        <FormControlLabel
          value="custom"
          control={<Radio />}
          label="Custom Amounts"
        />
      </RadioGroup>

      {splitType === 'equal' && (
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Number of Splits"
            type="number"
            value={splitCount}
            onChange={(e) => setSplitCount(Math.max(2, parseInt(e.target.value) || 2))}
            inputProps={{ min: 2, max: 10 }}
            sx={{ mb: 2 }}
          />
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Each person pays: <strong>{formatCurrency(equalAmount)}</strong>
              {remainingAmount > 0 && (
                <span> (First person pays extra {formatCurrency(remainingAmount)} for rounding)</span>
              )}
            </Typography>
          </Alert>
        </Box>
      )}

      <Typography variant="h6" gutterBottom>
        Payment Breakdown
      </Typography>

      <List>
        {subBills.map((bill, index) => (
          <ListItem key={bill.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
            <ListItemText
              primary={`Payment ${index + 1}`}
              secondary={
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Amount: {formatCurrency(bill.amount)}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <RadioGroup
                      row
                      value={bill.paymentMethod}
                      onChange={(e) => handleSubBillChange(bill.id, 'paymentMethod', e.target.value)}
                    >
                      <FormControlLabel
                        value="card"
                        control={<Radio size="small" />}
                        label="Card"
                      />
                      <FormControlLabel
                        value="cash"
                        control={<Radio size="small" />}
                        label="Cash"
                      />
                    </RadioGroup>
                  </Box>
                </Box>
              }
            />
            <Chip
              label={bill.status}
              color={bill.status === 'paid' ? 'success' : 'default'}
              size="small"
            />
          </ListItem>
        ))}
      </List>

      <Box sx={{ mt: 2, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Total Split: {formatCurrency(subBills.reduce((sum, bill) => sum + bill.amount, 0))}
        </Typography>
        {!isSplitValid() && (
          <Alert severity="error" sx={{ mt: 1 }}>
            Split amounts must equal the total order amount
          </Alert>
        )}
      </Box>

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
          onClick={handleSplitComplete}
          loading={loading}
          disabled={!isSplitValid()}
          startIcon={<PaymentIcon />}
        >
          Process Split Payment
        </LoadingButton>
      </Box>
    </Box>
  );
};

export default SplitPaymentForm; 