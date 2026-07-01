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
import LineNoteDialog from './LineNoteDialog';
import { getLineNoteFromOptions } from '../../utils/lineItemNote';

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
  /** Add or edit an ad-hoc kitchen note on a line */
  onUpdateLineNote?: (index: number, note: string) => void;
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
  onUpdateLineNote,
  formatCurrency,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [changeAmount, setChangeAmount] = useState('');
  const [changeSubmitting, setChangeSubmitting] = useState(false);
  const [lineNoteDialog, setLineNoteDialog] = useState<{ index: number; productName: string } | null>(
    null
  );

  const totalLabelSx = {
    fontWeight: 800,
    fontSize: { xs: '1.05rem', sm: '1.15rem', md: '1.2rem', lg: '1.25rem' },
    lineHeight: 1.1,
  } as const;

  const totalValueSx = {
    fontWeight: 900,
    fontSize: { xs: '1.65rem', sm: '1.9rem', md: '2.05rem', lg: '2.25rem' },
    lineHeight: 1.1,
  } as const;

  const primaryPayButtonSx = {
    py: isMobile ? 1.15 : 1.35,
    minHeight: isMobile ? 44 : 50,
    fontSize: { xs: '0.8rem', sm: '0.88rem', md: '0.95rem', lg: '1.02rem' },
    fontWeight: 800,
    whiteSpace: 'nowrap',
    lineHeight: 1,
    '& .MuiButton-startIcon': { mr: 0.6, ml: -0.25 },
  } as const;

  const secondaryPayButtonSx = {
    py: isMobile ? 0.85 : 1.05,
    minHeight: isMobile ? 40 : 46,
    fontSize: { xs: '0.72rem', sm: '0.8rem', md: '0.86rem', lg: '0.94rem' },
    fontWeight: 800,
    whiteSpace: 'nowrap',
    lineHeight: 1,
    '& .MuiButton-startIcon': { mr: 0.5, ml: -0.25 },
  } as const;

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
                  onEditLineNote={
                    onUpdateLineNote
                      ? (index) => {
                          const line = currentOrder[index];
                          if (!line) return;
                          setLineNoteDialog({ index, productName: line.productName });
                        }
                      : undefined
                  }
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
            <Typography variant="h6" sx={totalLabelSx}>
              Total TTC:
            </Typography>
            <Typography variant="h6" color="primary" sx={totalValueSx}>
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
                    ...primaryPayButtonSx,
                    bgcolor: 'primary.main',
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
                    ...primaryPayButtonSx,
                    bgcolor: 'success.main',
                    color: 'success.contrastText',
                    '&:hover': { bgcolor: 'success.dark' },
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
                    ...secondaryPayButtonSx,
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
                      ...secondaryPayButtonSx,
                      borderColor: 'error.light',
                      color: 'error.dark',
                      '&:hover': { borderColor: 'error.main', bgcolor: 'error.light' },
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

      <LineNoteDialog
        open={lineNoteDialog != null}
        productName={lineNoteDialog?.productName ?? ''}
        initialNote={
          lineNoteDialog != null
            ? getLineNoteFromOptions(currentOrder[lineNoteDialog.index]?.options)
            : ''
        }
        onClose={() => setLineNoteDialog(null)}
        onSave={(note) => {
          if (lineNoteDialog == null || !onUpdateLineNote) return;
          onUpdateLineNote(lineNoteDialog.index, note);
        }}
      />
    </Card>
  );
};

export default OrderSummary;
