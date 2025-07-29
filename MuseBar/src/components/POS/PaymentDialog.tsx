import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Grid,
  Divider,
  Alert,
  AlertTitle,
  Card,
  CardContent,
  Chip,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  CreditCard as CardIcon,
  LocalAtm as CashIcon,
  Receipt as ReceiptIcon,
  Calculate as CalculateIcon,
} from '@mui/icons-material';
import { OrderItem, LocalSubBill } from '../../types';
import { usePOSAPI } from '../../hooks/usePOSAPI';

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
  
  // Simple payment states
  const [simplePaymentMethod, setSimplePaymentMethod] = useState<'cash' | 'card'>('card');
  const [cashReceived, setCashReceived] = useState('');
  const [tips, setTips] = useState('');
  
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

  // Calculate change for cash payments
  const changeAmount = useMemo(() => {
    if (simplePaymentMethod === 'cash' && cashReceived) {
      const received = parseFloat(cashReceived);
      const totalWithTips = orderTotal + (parseFloat(tips) || 0);
      return Math.max(0, received - totalWithTips);
    }
    return 0;
  }, [simplePaymentMethod, cashReceived, orderTotal, tips]);

  // Validate simple payment
  const isSimplePaymentValid = useMemo(() => {
    if (simplePaymentMethod === 'card') {
      return true; // Card payments are always valid
    }
    
    // Cash payment validation
    const received = parseFloat(cashReceived) || 0;
    const totalWithTips = orderTotal + (parseFloat(tips) || 0);
    return received >= totalWithTips;
  }, [simplePaymentMethod, cashReceived, orderTotal, tips]);

  // Initialize split bills when switching to split tab
  const initializeSplitBills = useCallback(() => {
    if (splitType === 'equal') {
      const amountPerBill = orderTotal / splitCount;
      const itemsPerBill = Math.ceil(currentOrder.length / splitCount);
      const bills: LocalSubBill[] = Array.from({ length: splitCount }, (_, index) => ({
        id: `split-${index}`,
        items: currentOrder.slice(index * itemsPerBill, (index + 1) * itemsPerBill),
        total: amountPerBill,
        payments: [{ method: 'card', amount: amountPerBill }],
      }));
      setSubBills(bills);
    } else {
      // Custom split - start with empty bills
      const bills: LocalSubBill[] = Array.from({ length: splitCount }, (_, index) => ({
        id: `split-${index}`,
        items: [],
        total: 0,
        payments: [],
      }));
      setSubBills(bills);
    }
  }, [splitType, splitCount, orderTotal, currentOrder]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (newValue === 1) {
      initializeSplitBills();
    }
  };

  // Handle simple payment submission
  const handleSimplePayment = async () => {
    if (!isSimplePaymentValid) return;

    setLoading(true);
    try {
      const tipsAmount = parseFloat(tips) || 0;
      const change = changeAmount;

      await api.createOrder({
        items: currentOrder,
        totalAmount: orderTotal,
        totalTax: orderTax,
        paymentMethod: simplePaymentMethod,
        tips: tipsAmount,
        change: change,
        notes: `Paiement ${simplePaymentMethod === 'card' ? 'par carte' : 'en espèces'}${
          tipsAmount > 0 ? `, Pourboire: ${formatCurrency(tipsAmount)}` : ''
        }${change > 0 ? `, Rendu: ${formatCurrency(change)}` : ''}`,
      });

      onClearOrder();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle split payment submission
  const handleSplitPayment = async () => {
    const totalSplitAmount = subBills.reduce((sum, bill) => sum + bill.total, 0);
    if (Math.abs(totalSplitAmount - orderTotal) > 0.01) {
      onOrderError('Le total des paiements partagés ne correspond pas au montant de la commande');
      return;
    }

    setLoading(true);
    try {
      await api.createOrder({
        items: currentOrder,
        totalAmount: orderTotal,
        totalTax: orderTax,
        paymentMethod: 'split',
        subBills: subBills,
        notes: `Paiement partagé en ${subBills.length} parties`,
      });

      onClearOrder();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Split payment failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setTabValue(0);
    setSimplePaymentMethod('card');
    setCashReceived('');
    setTips('');
    setSplitType('equal');
    setSplitCount(2);
    setSubBills([]);
  };

  // Handle dialog close
  const handleClose = () => {
    if (!loading) {
      onClose();
      resetForm();
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
        Paiement - {formatCurrency(orderTotal)}
      </DialogTitle>

      <DialogContent>
        {/* Order Summary */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Résumé de la commande
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Sous-total (HT)
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatCurrency(orderSubtotal)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  TVA
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatCurrency(orderTax)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Total (TTC)</Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(orderTotal)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Payment Method Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab 
              label="Paiement Simple" 
              icon={<PaymentIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Paiement Partagé" 
              icon={<CalculateIcon />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Simple Payment Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mt: 2 }}>
            {/* Payment Method Selection */}
            <Typography variant="h6" gutterBottom>
              Mode de paiement
            </Typography>
            <RadioGroup
              value={simplePaymentMethod}
              onChange={(e) => setSimplePaymentMethod(e.target.value as 'cash' | 'card')}
              row
            >
              <FormControlLabel 
                value="card" 
                control={<Radio />} 
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <CardIcon />
                    Carte bancaire
                  </Box>
                } 
              />
              <FormControlLabel 
                value="cash" 
                control={<Radio />} 
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <CashIcon />
                    Espèces
                  </Box>
                } 
              />
            </RadioGroup>

            {/* Cash Payment Details */}
            {simplePaymentMethod === 'cash' && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Montant reçu"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      type="number"
                      inputProps={{ step: "0.01", min: "0" }}
                      error={!isSimplePaymentValid && cashReceived !== ''}
                      helperText={
                        !isSimplePaymentValid && cashReceived !== ''
                          ? 'Montant insuffisant'
                          : `Minimum requis: ${formatCurrency(orderTotal + (parseFloat(tips) || 0))}`
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Rendu"
                      value={formatCurrency(changeAmount)}
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Tips */}
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Pourboire (optionnel)"
                value={tips}
                onChange={(e) => setTips(e.target.value)}
                type="number"
                inputProps={{ step: "0.01", min: "0" }}
                sx={{ maxWidth: 200 }}
              />
            </Box>

            {/* Payment Validation */}
            {simplePaymentMethod === 'cash' && cashReceived && !isSimplePaymentValid && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <AlertTitle>Montant insuffisant</AlertTitle>
                Le montant reçu est insuffisant pour couvrir le total de la commande
                {parseFloat(tips) > 0 && ' et le pourboire'}.
              </Alert>
            )}
          </Box>
        </TabPanel>

        {/* Split Payment Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Configuration du paiement partagé
            </Typography>
            
            {/* Split Type */}
            <RadioGroup
              value={splitType}
              onChange={(e) => setSplitType(e.target.value as 'equal' | 'custom')}
            >
              <FormControlLabel 
                value="equal" 
                control={<Radio />} 
                label="Partage équitable" 
              />
              <FormControlLabel 
                value="custom" 
                control={<Radio />} 
                label="Montants personnalisés" 
              />
            </RadioGroup>

            {/* Split Count */}
            <TextField
              label="Nombre de paiements"
              value={splitCount}
              onChange={(e) => setSplitCount(Math.max(2, parseInt(e.target.value) || 2))}
              type="number"
              inputProps={{ min: "2", max: "10" }}
              sx={{ mt: 2, maxWidth: 200 }}
            />

            <Button 
              variant="outlined" 
              onClick={initializeSplitBills}
              sx={{ ml: 2, mt: 2 }}
            >
              Réinitialiser
            </Button>

            {/* Sub Bills */}
            {subBills.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Détails des paiements
                </Typography>
                <List>
                  {subBills.map((bill, index) => (
                    <ListItem key={bill.id} sx={{ bgcolor: 'grey.50', mb: 1, borderRadius: 1 }}>
                      <ListItemText
                        primary={`Paiement ${index + 1}`}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              Montant: {formatCurrency(bill.total)}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Mode: {bill.payments[0]?.method === 'card' ? 'Carte' : 'Espèces'}
                            </Typography>
                          </Box>
                        }
                      />
                      <Chip 
                        label={bill.payments.length > 0 ? 'Configuré' : 'En attente'} 
                        color={bill.payments.length > 0 ? 'success' : 'default'}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>

                {/* Split Summary */}
                <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>Total partagé:</strong> {formatCurrency(subBills.reduce((sum, bill) => sum + bill.total, 0))}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Montant commande:</strong> {formatCurrency(orderTotal)}
                  </Typography>
                  <Typography variant="body2" color={
                    Math.abs(subBills.reduce((sum, bill) => sum + bill.total, 0) - orderTotal) < 0.01 
                      ? 'success.main' 
                      : 'error.main'
                  }>
                    <strong>Différence:</strong> {formatCurrency(
                      subBills.reduce((sum, bill) => sum + bill.total, 0) - orderTotal
                    )}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={tabValue === 0 ? handleSimplePayment : handleSplitPayment}
          disabled={
            loading || 
            (tabValue === 0 ? !isSimplePaymentValid : 
             Math.abs(subBills.reduce((sum, bill) => sum + bill.total, 0) - orderTotal) > 0.01)
          }
          startIcon={loading ? <CircularProgress size={20} /> : <ReceiptIcon />}
        >
          {loading ? 'Traitement...' : 'Confirmer le paiement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentDialog; 