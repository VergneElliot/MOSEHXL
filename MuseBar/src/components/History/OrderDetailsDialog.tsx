import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { Order } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';

interface OrderDetailsDialogProps {
  order: Order | null;
  onClose: () => void;
  formatDateTime: (date: Date | string) => string;
  getPaymentMethodLabel: (method: string) => string;
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  order,
  onClose,
  formatDateTime,
  getPaymentMethodLabel,
}) => {
  if (!order) return null;

  const isChange = order.operationType === 'change';
  const changeAmount = order.changeAmount ?? 0;
  const notes = order.notes || '';
  const isTipChange = notes.toLowerCase().includes('pourboire');

  const safeNumber = (value: number): number =>
    Number.isFinite(value) ? value : 0;

  const itemsTotal = safeNumber(order.items.reduce((s, i) => s + i.totalPrice, 0));
  const vatTotal =
    order.items.length > 0 && !Number.isFinite(order.taxAmount)
      ? safeNumber(order.items.reduce((s, i) => s + i.taxAmount, 0))
      : safeNumber(order.taxAmount);
  const totalTTC = safeNumber(order.totalAmount);

  const getPaymentBreakdown = () => {
    if (isChange && changeAmount !== 0) {
      const absAmount = Math.abs(changeAmount);
      const isReversal = changeAmount < 0;
      const baseLabel = isTipChange ? 'Pourboire' : 'Faire de la monnaie';
      const reversalLabel = isTipChange ? 'Annulation pourboire' : 'Annulation faire de la monnaie';
      return (
        <Typography variant="body2" color="textSecondary">
          {isReversal ? reversalLabel : baseLabel} :{' '}
          {isReversal ? '-' : '+'}
          {formatCurrency(absAmount)} Carte, {isReversal ? '+' : '−'}
          {formatCurrency(absAmount)} Espèces
        </Typography>
      );
    }
    if (order.paymentMethod === 'split' && order.subBills && order.subBills.length > 0) {
      const card = order.subBills
        .filter(s => s.paymentMethod === 'card')
        .reduce((sum, s) => sum + s.amount, 0);
      const cash = order.subBills
        .filter(s => s.paymentMethod === 'cash')
        .reduce((sum, s) => sum + s.amount, 0);
      const parts: string[] = [];
      if (card !== 0) parts.push(`${formatCurrency(card)} Carte`);
      if (cash !== 0) parts.push(`${formatCurrency(cash)} Espèces`);
      return (
        <Typography variant="body2" color="textSecondary">
          Mixte : {parts.join(', ')}
        </Typography>
      );
    }
    return (
      <Typography variant="body2" color="textSecondary">
        {getPaymentMethodLabel(order.paymentMethod)} : {formatCurrency(totalTTC)}
      </Typography>
    );
  };

  const statusLabel =
    order.status === 'completed' ? 'Terminé' : order.status === 'pending' ? 'En attente' : 'Annulé';

  return (
    <Dialog open={!!order} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle>
        Détails de la commande #{String(order.id).slice(0, 8)}…
        <Chip label={statusLabel} size="small" sx={{ ml: 1 }} color={order.status === 'completed' ? 'success' : 'default'} />
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="textSecondary">
            📅 {formatDateTime(order.createdAt)}
          </Typography>

          {!isChange && order.items.length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Article</TableCell>
                    <TableCell align="right">Qté</TableCell>
                    <TableCell align="right">P.U. TTC</TableCell>
                    <TableCell align="right">Total TTC</TableCell>
                    <TableCell align="right">TVA</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.totalPrice)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.taxAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {isChange && (
            <Typography variant="body2" color="textSecondary" fontStyle="italic">
              {isTipChange
                ? 'Opération de pourboire (ajustement de caisse) — pas d’articles.'
                : 'Opération « faire de la monnaie » — pas d’articles.'}
            </Typography>
          )}

          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1 }}>
            {!isChange && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Sous-total TTC (articles)</Typography>
                  <Typography variant="body2">{formatCurrency(itemsTotal)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">TVA totale</Typography>
                  <Typography variant="body2">{formatCurrency(vatTotal)}</Typography>
                </Box>
              </>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', mt: 1 }}>
              <Typography>Total TTC</Typography>
              <Typography>{formatCurrency(totalTTC)}</Typography>
            </Box>
            {order.tips != null && order.tips > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="body2" color="textSecondary">
                  Pourboire
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  +{formatCurrency(order.tips)}
                </Typography>
              </Box>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Paiement
            </Typography>
            {getPaymentBreakdown()}
          </Box>

          {order.notes && order.notes.trim() && (
            <Typography variant="body2" color="textSecondary">
              Note : {order.notes}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrderDetailsDialog;
