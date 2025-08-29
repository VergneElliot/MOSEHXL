/**
 * Payment Dialog Container Component
 * Main orchestrator for the modular payment system
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  CreditCard as SimplePaymentIcon,
  Group as SplitPaymentIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { PaymentDialogProps, PaymentTabPanelProps } from './types';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { PaymentCalculator } from './PaymentCalculator';
import { PaymentConfirmation } from './PaymentConfirmation';
import { SplitPayment } from './SplitPayment';
import { usePaymentLogic } from './usePaymentLogic';
import OrderSummaryCard from '../OrderSummaryCard';

/**
 * Tab Panel Component
 */
function TabPanel(props: PaymentTabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`payment-tabpanel-${index}`}
      aria-labelledby={`payment-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

/**
 * Payment Dialog Container Component
 */
export const PaymentDialogContainer: React.FC<PaymentDialogProps> = ({
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const paymentLogic = usePaymentLogic(
    currentOrder,
    orderTotal,
    orderTax,
    onOrderComplete,
    onOrderError,
    onDataUpdate,
    onClearOrder,
    onClose
  );

  // Handle dialog close
  const handleClose = () => {
    if (!paymentLogic.state.loading) {
      onClose();
      paymentLogic.resetForm();
    }
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    paymentLogic.setTabValue(newValue);
    
    // Initialize split bills when switching to split tab
    if (newValue === 1 && paymentLogic.state.subBills.length === 0) {
      paymentLogic.initializeSplitBills();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PaymentIcon />
        Paiement - {paymentLogic.formatCurrency(orderTotal)}
      </DialogTitle>

      <DialogContent>
        {/* Order Summary */}
        <Box sx={{ mb: 3 }}>
          <OrderSummaryCard
            orderTotal={orderTotal}
            orderTax={orderTax}
            orderSubtotal={orderSubtotal}
            formatCurrency={paymentLogic.formatCurrency}
          />
        </Box>

        {/* Payment Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={paymentLogic.state.tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            aria-label="payment tabs"
          >
            <Tab
              icon={<SimplePaymentIcon />}
              label="Paiement simple"
              id="payment-tab-0"
              aria-controls="payment-tabpanel-0"
              iconPosition="start"
            />
            <Tab
              icon={<SplitPaymentIcon />}
              label="Paiement partagé"
              id="payment-tab-1"
              aria-controls="payment-tabpanel-1"
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Simple Payment Tab */}
        <TabPanel value={paymentLogic.state.tabValue} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Payment Method Selection */}
            <PaymentMethodSelector
              paymentMethod={paymentLogic.state.simplePaymentMethod}
              onMethodChange={paymentLogic.setSimplePaymentMethod}
              disabled={paymentLogic.state.loading}
            />

            {/* Payment Calculator */}
            <PaymentCalculator
              paymentMethod={paymentLogic.state.simplePaymentMethod}
              orderTotal={orderTotal}
              tips={paymentLogic.state.tips}
              onTipsChange={paymentLogic.setTips}
              cashReceived={paymentLogic.state.cashReceived}
              onCashReceivedChange={paymentLogic.setCashReceived}
              changeAmount={paymentLogic.changeAmount}
              isValid={paymentLogic.isSimplePaymentValid}
              disabled={paymentLogic.state.loading}
            />

            {/* Payment Confirmation */}
            <PaymentConfirmation
              orderTotal={orderTotal}
              tips={paymentLogic.state.tips}
              paymentMethod={paymentLogic.state.simplePaymentMethod}
              cashReceived={paymentLogic.state.cashReceived}
              changeAmount={paymentLogic.changeAmount}
              isValid={paymentLogic.isSimplePaymentValid}
              loading={paymentLogic.state.loading}
              onConfirm={paymentLogic.handleSimplePayment}
              onCancel={handleClose}
            />
          </Box>
        </TabPanel>

        {/* Split Payment Tab */}
        <TabPanel value={paymentLogic.state.tabValue} index={1}>
          <SplitPayment
            orderTotal={orderTotal}
            currentOrder={currentOrder}
            splitType={paymentLogic.state.splitType}
            splitCount={paymentLogic.state.splitCount}
            subBills={paymentLogic.state.subBills}
            onSplitTypeChange={paymentLogic.setSplitType}
            onSplitCountChange={paymentLogic.setSplitCount}
            onSubBillsChange={paymentLogic.setSubBills}
            onInitialize={paymentLogic.initializeSplitBills}
            loading={paymentLogic.state.loading}
            onConfirm={paymentLogic.handleSplitPayment}
          />
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button
          startIcon={<CancelIcon />}
          onClick={handleClose}
          disabled={paymentLogic.state.loading}
        >
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentDialogContainer;

