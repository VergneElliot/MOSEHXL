/**
 * Payment options dialog:
 * - Tab Partage: two-column split board
 * - Tab Faire de la monnaie: card→cash change
 */

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  Alert,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  CallSplit as SplitTabIcon,
  SwapHoriz as ChangeTabIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { PaymentDialogProps, PaymentTabPanelProps } from './types';
import { SplitBoard } from './SplitBoard';
import { ChangeMakingPanel } from './ChangeMakingPanel';
import { usePaymentLogic } from './usePaymentLogic';
import OrderSummaryCard from '../OrderSummaryCard';
import { formatCurrency } from '../../../utils/formatCurrency';
import { tipsFromOrder } from '../../../hooks/usePOSOrderTotals';
import {
  paymentMethodBreakdown,
  taxBreakdownByRate,
} from './splitAssignment';

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
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

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
  onFaireDeLaMonnaie,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const tipsTotal = tipsFromOrder(currentOrder);

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

  const taxParts = useMemo(() => taxBreakdownByRate(currentOrder), [currentOrder]);
  const splitValid = useMemo(() => {
    const bills = paymentLogic.state.subBills;
    if (bills.length === 0) return false;
    const sum = bills.reduce((s, b) => s + b.total, 0);
    return Math.round(sum * 100) === Math.round(orderTotal * 100);
  }, [paymentLogic.state.subBills, orderTotal]);
  const methods = useMemo(
    () => paymentMethodBreakdown(paymentLogic.state.subBills),
    [paymentLogic.state.subBills]
  );

  const handleClose = () => {
    if (!paymentLogic.state.loading) {
      onClose();
      paymentLogic.resetForm();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PaymentIcon />
        Options de paiement — {formatCurrency(orderTotal)}
      </DialogTitle>

      <DialogContent>
        {tipsTotal > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Pourboire carte (hors CA) : <strong>{formatCurrency(tipsTotal)}</strong>
              {' — '}enregistré séparément (+carte / −espèces)
            </Typography>
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={paymentLogic.state.tabValue}
            onChange={(_e, v) => paymentLogic.setTabValue(v)}
            variant="fullWidth"
          >
            <Tab
              icon={<SplitTabIcon />}
              iconPosition="start"
              label="Partage"
              id="payment-tab-0"
              aria-controls="payment-tabpanel-0"
            />
            <Tab
              icon={<ChangeTabIcon />}
              iconPosition="start"
              label="Faire de la monnaie"
              id="payment-tab-1"
              aria-controls="payment-tabpanel-1"
              disabled={!onFaireDeLaMonnaie}
            />
          </Tabs>
        </Box>

        <TabPanel value={paymentLogic.state.tabValue} index={0}>
          <SplitBoard
            orderTotal={orderTotal}
            currentOrder={currentOrder}
            splitCount={paymentLogic.state.splitCount}
            subBills={paymentLogic.state.subBills}
            onSplitCountChange={paymentLogic.setSplitCount}
            onSubBillsChange={paymentLogic.setSubBills}
            onSubBillPaymentMethodChange={paymentLogic.updateSubBillPaymentMethod}
            loading={paymentLogic.state.loading}
            onConfirm={paymentLogic.handleSplitPayment}
          />
        </TabPanel>

        <TabPanel value={paymentLogic.state.tabValue} index={1}>
          {onFaireDeLaMonnaie ? (
            <ChangeMakingPanel onSubmit={onFaireDeLaMonnaie} onClose={handleClose} />
          ) : (
            <Alert severity="warning">Fonction indisponible.</Alert>
          )}
        </TabPanel>

        <OrderSummaryCard
          orderTotal={orderTotal}
          orderTax={orderTax}
          orderSubtotal={orderSubtotal}
          formatCurrency={formatCurrency}
          tax10={taxParts.rate10}
          tax20={taxParts.rate20}
          showPaymentBreakdown={splitValid && paymentLogic.state.tabValue === 0}
          cashTotal={methods.cash}
          cardTotal={methods.card}
        />
      </DialogContent>

      <DialogActions>
        <Button startIcon={<CancelIcon />} onClick={handleClose} disabled={paymentLogic.state.loading}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentDialogContainer;
