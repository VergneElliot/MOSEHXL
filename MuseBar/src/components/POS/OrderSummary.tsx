import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  IconButton,
  Divider,
  Button,
  Box,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
} from '@mui/material';
import {
  Clear as ClearIcon,
  CreditCard as CreditCardIcon,
  LocalAtm as CashIcon,
  Settings as OptionsIcon,
  SwapHoriz as ChangeIcon,
} from '@mui/icons-material';
import { OrderItem } from '../../types';
import OrderSummaryItem from './OrderSummaryItem';

interface OrderSummaryProps {
  currentOrder: OrderItem[];
  orderTotal: number;
  orderTax: number;
  orderSubtotal: number;
  canProcessPayment: boolean;
  onRemoveItem: (index: number) => void;
  onClearOrder: () => void;
  /** Open payment options dialog (split, tip, change) */
  onCheckout: () => void;
  /** Quick payment: full order by card */
  onQuickCard?: () => void;
  /** Quick payment: full order by cash */
  onQuickCash?: () => void;
  /** Faire de la monnaie: customer pays amount by card, receives same amount in cash */
  onFaireDeLaMonnaie?: (amount: number) => Promise<void>;
  /** Apply default Happy Hour discount to this line (manual) */
  onApplyHappyHour?: (index: number) => void;
  /** Set line to 0€ — offered to customer (traceability: [Offert]) */
  onApplyOffert?: (index: number) => void;
  /** Set line to 0€ — consumed by staff (traceability: [Perso]) */
  onApplyPerso?: (index: number) => void;
  formatCurrency: (amount: number) => string;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  currentOrder,
  orderTotal,
  orderTax,
  orderSubtotal,
  canProcessPayment,
  onRemoveItem,
  onClearOrder,
  onCheckout,
  onQuickCard,
  onQuickCash,
  onFaireDeLaMonnaie,
  onApplyHappyHour,
  onApplyOffert,
  onApplyPerso,
  formatCurrency,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [changeAmount, setChangeAmount] = useState('');
  const [changeSubmitting, setChangeSubmitting] = useState(false);

  const handleOpenChangeDialog = () => setChangeDialogOpen(true);
  const handleCloseChangeDialog = () => {
    if (!changeSubmitting) {
      setChangeDialogOpen(false);
      setChangeAmount('');
    }
  };
  const handleConfirmChange = async () => {
    const parsed = parseFloat(changeAmount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    if (!onFaireDeLaMonnaie) return;
    setChangeSubmitting(true);
    try {
      await onFaireDeLaMonnaie(parsed);
      handleCloseChangeDialog();
    } finally {
      setChangeSubmitting(false);
    }
  };

  return (
    <Card sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CardContent
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pt: 0.4,
          px: 1.25,
          pb: 0.75,
          '&:last-child': { pb: 0.75 },
        }}
      >
        <Box sx={{ flexShrink: 0 }} display="flex" justifyContent="space-between" alignItems="center" mb={0.25}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
            Commande
          </Typography>
          {currentOrder.length > 0 && (
            <IconButton onClick={onClearOrder} color="error" size="small" title="Vider la commande">
              <ClearIcon />
            </IconButton>
          )}
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {currentOrder.length === 0 ? (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              textAlign="center"
              py={4}
              minHeight="100%"
            >
              <Typography color="textSecondary">Aucun article sélectionné</Typography>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {currentOrder.map((item, index) => (
                <OrderSummaryItem
                  key={`${item.id}-${index}`}
                  item={item}
                  index={index}
                  isLast={index === currentOrder.length - 1}
                  formatCurrency={formatCurrency}
                  onRemoveItem={onRemoveItem}
                  onApplyHappyHour={onApplyHappyHour}
                  onApplyOffert={onApplyOffert}
                  onApplyPerso={onApplyPerso}
                />
              ))}
            </List>
          )}
        </Box>

        <Box sx={{ flexShrink: 0, pt: 1 }}>
          <Divider sx={{ mb: 1 }} />
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
            <Box display="flex" alignItems="center" gap={1.25}>
              <Typography variant="body2">
                Sous-total HT: <Box component="span" sx={{ fontWeight: 600 }}>{formatCurrency(orderSubtotal - orderTax)}</Box>
              </Typography>
              <Typography variant="body2">
                TVA: <Box component="span" sx={{ fontWeight: 600 }}>{formatCurrency(orderTax)}</Box>
              </Typography>
            </Box>
          </Box>

          <Box display="flex" justifyContent="space-between">
            <Typography variant="h6" fontWeight="bold">
              Total TTC:
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="primary">
              {formatCurrency(orderTotal)}
            </Typography>
          </Box>

          <Box sx={{ mt: 1 }}>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Button
                  variant="contained"
                  fullWidth
                  size="medium"
                  onClick={onQuickCard}
                  disabled={!canProcessPayment}
                  startIcon={<CreditCardIcon />}
                  sx={{
                    py: isMobile ? 1 : 1.1,
                    fontSize: { xs: '0.72rem', sm: '0.78rem', md: '0.82rem', lg: '0.9rem' },
                    fontWeight: 'bold',
                    bgcolor: 'primary.main',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                    '& .MuiButton-startIcon': { mr: 0.5, ml: -0.25 },
                  }}
                >
                  Paiement CB
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  variant="contained"
                  fullWidth
                  size="medium"
                  onClick={onQuickCash}
                  disabled={!canProcessPayment}
                  startIcon={<CashIcon />}
                  sx={{
                    py: isMobile ? 1 : 1.1,
                    fontSize: { xs: '0.72rem', sm: '0.78rem', md: '0.82rem', lg: '0.9rem' },
                    fontWeight: 'bold',
                    bgcolor: 'success.main',
                    color: 'success.contrastText',
                    '&:hover': { bgcolor: 'success.dark' },
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                    '& .MuiButton-startIcon': { mr: 0.5, ml: -0.25 },
                  }}
                >
                  Paiement espèces
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  size="medium"
                  onClick={onCheckout}
                  disabled={!canProcessPayment}
                  startIcon={<OptionsIcon />}
                  sx={{
                    py: isMobile ? 0.3 : 0.4,
                    minHeight: isMobile ? 30 : 32,
                    fontSize: { xs: '0.62rem', sm: '0.68rem', md: '0.72rem', lg: '0.82rem' },
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                    '& .MuiButton-startIcon': { mr: 0.35, ml: -0.25 },
                  }}
                >
                  Options de paiement
                </Button>
              </Grid>
              <Grid item xs={6}>
                {onFaireDeLaMonnaie ? (
                  <Button
                    variant="outlined"
                    fullWidth
                    size="medium"
                    onClick={handleOpenChangeDialog}
                    startIcon={<ChangeIcon />}
                    sx={{
                      py: isMobile ? 0.3 : 0.4,
                      minHeight: isMobile ? 30 : 32,
                      fontSize: { xs: '0.62rem', sm: '0.68rem', md: '0.72rem', lg: '0.82rem' },
                      fontWeight: 'bold',
                      borderColor: 'error.light',
                      color: 'error.dark',
                      '&:hover': { borderColor: 'error.main', bgcolor: 'error.light' },
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                      '& .MuiButton-startIcon': { mr: 0.35, ml: -0.25 },
                    }}
                  >
                    Faire de la monnaie
                  </Button>
                ) : (
                  <Box />
                )}
              </Grid>
            </Grid>
          </Box>
        </Box>
      </CardContent>

      <Dialog open={changeDialogOpen} onClose={handleCloseChangeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Faire de la monnaie</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Le client paie par carte et reçoit le même montant en espèces.
          </Typography>
          <TextField
            autoFocus
            label="Montant (€)"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            value={changeAmount}
            onChange={(e) => setChangeAmount(e.target.value)}
            fullWidth
            error={changeAmount !== '' && (parseFloat(changeAmount.replace(',', '.')) <= 0 || !Number.isFinite(parseFloat(changeAmount.replace(',', '.'))))}
            helperText={changeAmount !== '' && parseFloat(changeAmount.replace(',', '.')) <= 0 ? 'Le montant doit être strictement positif' : undefined}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseChangeDialog} disabled={changeSubmitting}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirmChange}
            variant="contained"
            disabled={
              changeSubmitting ||
              !changeAmount ||
              !Number.isFinite(parseFloat(changeAmount.replace(',', '.'))) ||
              parseFloat(changeAmount.replace(',', '.')) <= 0
            }
          >
            {changeSubmitting ? 'Enregistrement…' : 'Valider'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default OrderSummary;
