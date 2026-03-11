/**
 * Dialog to add a "Divers" (misc) line: custom price, tax rate, and required description for traceability.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';
import { Category as DiversIcon } from '@mui/icons-material';

export interface DiversFormData {
  description: string;
  price: string;
  taxRate: number;
}

const TAX_OPTIONS = [
  { value: 0.055, label: '5,5% (Très réduit)' },
  { value: 0.1, label: '10% (Réduit)' },
  { value: 0.2, label: '20% (Normal)' },
] as const;

interface DiversDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: DiversFormData) => void;
  formatCurrency: (amount: number) => string;
}

const initialForm: DiversFormData = {
  description: '',
  price: '',
  taxRate: 0.2,
};

export const DiversDialog: React.FC<DiversDialogProps> = ({
  open,
  onClose,
  onSubmit,
  formatCurrency,
}) => {
  const [form, setForm] = useState<DiversFormData>(initialForm);
  const [touched, setTouched] = useState(false);

  const handleClose = () => {
    setForm(initialForm);
    setTouched(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const desc = form.description.trim();
    const price = parseFloat(form.price.replace(',', '.'));
    if (!desc || Number.isNaN(price) || price < 0) return;
    onSubmit({ description: desc, price: form.price, taxRate: form.taxRate });
    handleClose();
  };

  const priceNum = parseFloat(form.price.replace(',', '.'));
  const isValid = form.description.trim().length > 0 && !Number.isNaN(priceNum) && priceNum >= 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DiversIcon />
          Divers — Article personnalisé
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Saisissez un montant et une description pour tracer l&apos;article (extras, consommations non au menu, etc.).
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Description"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              required
              fullWidth
              multiline
              rows={2}
              placeholder="Ex: Supplément glace, Corbeille pain..."
              error={touched && !form.description.trim()}
              helperText={touched && !form.description.trim() ? 'Requis pour la traçabilité' : undefined}
              autoFocus
            />
            <TextField
              label="Prix TTC (€)"
              type="number"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              required
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
              error={touched && (form.price === '' || parseFloat(form.price.replace(',', '.')) < 0)}
              helperText={touched && form.price !== '' && parseFloat(form.price.replace(',', '.')) < 0 ? 'Le prix doit être ≥ 0' : undefined}
            />
            <FormControl fullWidth required>
              <InputLabel>Taux de TVA</InputLabel>
              <Select
                value={form.taxRate}
                label="Taux de TVA"
                onChange={e => setForm(f => ({ ...f, taxRate: e.target.value as number }))}
              >
                {TAX_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {!Number.isNaN(priceNum) && priceNum >= 0 && (
              <Typography variant="body2" color="text.secondary">
                Montant TTC : {formatCurrency(priceNum)}
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

export default DiversDialog;
