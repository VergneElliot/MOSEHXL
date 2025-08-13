/**
 * Payment Dialog Component
 * Main payment dialog that handles all payment methods
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { OrderItem } from '../../types';

import { usePOSAPI } from '../../hooks/usePOSAPI';
import PaymentMethodSelector from './PaymentMethodSelector';
import SplitPaymentForm from './SplitPaymentForm';

interface LocalSubBill {
  id: string;
  paymentMethod: 'cash' | 'card';
  amount: number;
  status: 'pending' | 'paid';
}

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  currentOrder: OrderItem[];
  orderTotal: number;
  orderTax: number;
  orderSubtotal: number;
  onOrderComplete: (message: string) => void;
  onOrderError: (message: string) => void;
  onDataUpdate: () => void;
  onClearOrder: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
  </div>
);

const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open,
  onClose,
  currentOrder,
  orderTotal,
  orderTax,
  orderSubtotal,
  onOrderComplete,
  onOrderError,
  onDataUpdate,
  onClearOrder,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // API hook
  const api = usePOSAPI(onOrderComplete, onOrderError, onDataUpdate);
  
  // State management
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
  };

const handleSimplePayment = async (paymentData: {
  items: OrderItem[];
  totalAmount: number;
  totalTax: number;
  paymentMethod: 'cash' | 'card';
  tips?: number;
  change?: number;
  notes?: string;
}) => {
    setLoading(true);
    setError('');

    try {
      const orderData = {
        totalAmount: paymentData.total,
        totalTax: orderTax,
        paymentMethod: paymentData.method as 'cash' | 'card',
        notes: `Paiement par ${paymentData.method === 'cash' ? 'espèces' : 'carte'}: ${paymentData.total}€`,
        tips: paymentData.tips,
        change: paymentData.change,
        items: currentOrder,
      };

      await api.createOrder(orderData);
      onClearOrder();
      onClose();
    } catch (err) {
      setError('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSplitPayment = async (subBills: LocalSubBill[]) => {
    setLoading(true);
    setError('');

    try {
      const orderData = {
        totalAmount: orderTotal,
        totalTax: orderTax,
        paymentMethod: 'split' as const,
        notes: `Paiement divisé en ${subBills.length} parts`,
        items: currentOrder,
        subBills: subBills.map(bill => ({
          id: bill.id,
          items: [], // Empty items for split bills
          total: bill.amount,
          payments: [{
            amount: bill.amount,
            method: bill.paymentMethod
          }]
        })),
      };

      await api.createOrder(orderData);
      onClearOrder();
      onClose();
    } catch (err) {
      setError('Failed to process split payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaymentIcon />
          <Typography variant="h6">Payment</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          <Tab label="Simple Payment" />
          <Tab label="Split Payment" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <PaymentMethodSelector
            orderTotal={orderTotal}
            orderTax={orderTax}
            orderSubtotal={orderSubtotal}
            onPaymentComplete={handleSimplePayment}
            onCancel={handleCancel}
            loading={loading}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <SplitPaymentForm
            orderTotal={orderTotal}
            orderTax={orderTax}
            orderSubtotal={orderSubtotal}
            onSplitComplete={handleSplitPayment}
            onCancel={handleCancel}
            loading={loading}
          />
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentDialog; 