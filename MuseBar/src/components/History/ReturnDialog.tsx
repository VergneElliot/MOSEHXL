import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Order } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';

interface ReturnDialogProps {
  open: boolean;
  order: Order | null;
  reason: string;
  onReasonChange: (value: string) => void;
  isPartial: boolean;
  onPartialChange: (value: boolean) => void;
  selectedItemIds: string[];
  onSelectedItemIdsChange: (ids: string[]) => void;
  selectedTip: boolean;
  onSelectedTipChange: (value: boolean) => void;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
  errorMessage: string;
  formatDateTime: (date: Date | string) => string;
}

const ReturnDialog: React.FC<ReturnDialogProps> = ({
  open,
  order,
  reason,
  onReasonChange,
  isPartial,
  onPartialChange,
  selectedItemIds,
  onSelectedItemIdsChange,
  selectedTip,
  onSelectedTipChange,
  onConfirm,
  onClose,
  loading,
  errorMessage,
  formatDateTime,
}) => {
  if (!order) return null;

  const toggleItem = (itemId: string) => {
    if (selectedItemIds.includes(itemId)) {
      onSelectedItemIdsChange(selectedItemIds.filter(id => id !== itemId));
    } else {
      onSelectedItemIdsChange([...selectedItemIds, itemId]);
    }
  };

  const hasTip = order.tips != null && order.tips > 0;
  const canConfirm =
    reason.trim().length > 0 &&
    (!isPartial || selectedItemIds.length > 0 || selectedTip);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Retour / Annulation</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="textSecondary">
            Commande #{String(order.id).slice(0, 8)}… — {formatDateTime(order.createdAt)} —{' '}
            {formatCurrency(order.totalAmount)}
          </Typography>

          <TextField
            label="Motif du retour (obligatoire)"
            value={reason}
            onChange={e => onReasonChange(e.target.value)}
            multiline
            rows={2}
            fullWidth
            required
            placeholder="Ex. client a changé d'avis, erreur de commande…"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={isPartial}
                onChange={e => onPartialChange(e.target.checked)}
                disabled={order.operationType === 'change' || order.items.length === 0}
              />
            }
            label="Retour partiel (sélectionner les articles à annuler)"
          />

          {isPartial && order.items.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Articles à retourner
              </Typography>
              <List dense sx={{ bgcolor: 'action.hover', borderRadius: 1 }}>
                {order.items.map(item => (
                  <ListItem
                    key={item.id}
                    sx={{ py: 0.5 }}
                    secondaryAction={
                      <Checkbox
                        edge="end"
                        checked={selectedItemIds.includes(item.id)}
                        onChange={() => toggleItem(item.id)}
                      />
                    }
                  >
                    <Typography variant="body2">
                      {item.quantity}× {item.productName} — {formatCurrency(item.totalPrice)}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {hasTip && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedTip}
                  onChange={e => onSelectedTipChange(e.target.checked)}
                />
              }
              label={`Inclure le pourboire (${formatCurrency(order.tips!)}) dans le retour`}
            />
          )}

          {errorMessage && (
            <Alert severity="error" onClose={() => {}}>
              {errorMessage}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={onConfirm}
          disabled={loading || !canConfirm}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {loading ? 'Traitement…' : 'Confirmer le retour'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReturnDialog;
