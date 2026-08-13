/**
 * Dialog to add a card tip ("Pourboire") line.
 * Tips are NOT sale CA: they are tracked as orders.tips and adjust
 * daily payment breakdown (+card / −cash). See paymentBreakdown.ts.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { VolunteerActivism as TipIcon } from '@mui/icons-material';

export interface PourboireFormData {
  amount: string;
}

interface PourboireDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PourboireFormData) => void;
  formatCurrency: (amount: number) => string;
}

export const PourboireDialog: React.FC<PourboireDialogProps> = ({
  open,
  onClose,
  onSubmit,
  formatCurrency,
}) => {
  const [amount, setAmount] = useState('');
  const [touched, setTouched] = useState(false);

  const handleClose = () => {
    setAmount('');
    setTouched(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const value = parseFloat(amount.replace(',', '.'));
    if (Number.isNaN(value) || value <= 0) return;
    onSubmit({ amount });
    handleClose();
  };

  const amountNum = parseFloat(amount.replace(',', '.'));
  const isValid = !Number.isNaN(amountNum) && amountNum > 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TipIcon />
          Pourboire (carte)
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Le pourboire carte n&apos;entre pas dans le chiffre d&apos;affaires. Il augmente le
            total carte du jour et diminue le total espèces (retrait caisse pour le personnel).
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Montant du pourboire (€)"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              fullWidth
              autoFocus
              inputProps={{ min: 0.01, step: 0.01 }}
              error={touched && !isValid}
              helperText={
                touched && !isValid ? 'Saisissez un montant strictement positif' : undefined
              }
            />
            {isValid && (
              <Typography variant="body2" color="text.secondary">
                Pourboire : {formatCurrency(amountNum)}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuler</Button>
          <Button type="submit" variant="contained" disabled={!isValid}>
            Ajouter à la commande
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PourboireDialog;
