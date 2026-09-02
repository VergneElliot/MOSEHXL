import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Box,
} from '@mui/material';

export interface RemiseFormData {
  discountType: 'percentage' | 'fixed';
  discountValue: number;
}

interface RemiseDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: RemiseFormData) => void;
}

const RemiseDialog: React.FC<RemiseDialogProps> = ({ open, onClose, onConfirm }) => {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [rawValue, setRawValue] = useState('10');

  useEffect(() => {
    if (open) {
      setDiscountType('percentage');
      setRawValue('10');
    }
  }, [open]);

  const parsed = parseFloat(rawValue.replace(',', '.'));
  const valid =
    Number.isFinite(parsed) &&
    parsed > 0 &&
    (discountType === 'percentage' ? parsed <= 100 : true);

  const handleConfirm = () => {
    if (!valid) return;
    onConfirm({ discountType, discountValue: parsed });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Remise sur la sélection</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Applique une réduction en euros ou en pourcentage sur les lignes sélectionnées (ou toute la
          commande si aucune sélection).
        </Typography>
        <Box sx={{ mb: 2 }}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={discountType}
            onChange={(_e, v: 'percentage' | 'fixed' | null) => {
              if (v) setDiscountType(v);
            }}
          >
            <ToggleButton value="percentage">Pourcentage (%)</ToggleButton>
            <ToggleButton value="fixed">Montant (€)</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <TextField
          autoFocus
          fullWidth
          label={discountType === 'percentage' ? 'Réduction (%)' : 'Réduction (€)'}
          value={rawValue}
          onChange={(e) => setRawValue(e.target.value.replace(/[^\d.,]/g, ''))}
          inputMode="decimal"
          helperText={
            discountType === 'percentage'
              ? 'Ex. 10 pour −10 %'
              : 'Ex. 2,50 pour −2,50 € par unité'
          }
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" disabled={!valid} onClick={handleConfirm}>
          Appliquer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RemiseDialog;
