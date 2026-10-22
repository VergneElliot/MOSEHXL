import React from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import type { LocalSubBill } from '../../../types';
import { formatCurrency } from '../../../utils/formatCurrency';
import { fromCents } from './splitBillCore';
import { selectOnFocus } from './selectOnFocus';
import type { SplitRepartirState } from './useSplitRepartir';

interface SplitRepartirDialogProps {
  subBills: LocalSubBill[];
  repartir: SplitRepartirState;
}

const SplitRepartirDialog: React.FC<SplitRepartirDialogProps> = ({ subBills, repartir }) => (
  <Dialog
    open={repartir.pickBillsOpen}
    onClose={repartir.closeRepartirDialog}
    maxWidth="xs"
    fullWidth
  >
    <DialogTitle>Répartir</DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Articles : <strong>{formatCurrency(repartir.pickItemsTotal)}</strong>
        {' — '}cochez les paiements, laissez vide pour parts égales, ou saisissez des montants
        (le dernier champ vide complète le reste).
      </Typography>
      {subBills.map((_, index) => {
        const checked = repartir.pickBillIds.has(index);
        const isRes = checked && repartir.pickResidual === index;
        const shareC = repartir.pickShares[index] ?? 0;
        const typed = (repartir.pickAmounts[index] ?? '').trim() !== '';
        const display = !checked
          ? ''
          : typed
            ? repartir.pickAmounts[index] ?? ''
            : isRes || Object.values(repartir.pickParsedAmounts).every(v => v == null)
              ? fromCents(shareC).toFixed(2)
              : '';
        return (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1,
              opacity: checked ? 1 : 0.55,
            }}
          >
            <FormControlLabel
              sx={{ mr: 0, minWidth: 130 }}
              control={
                <Checkbox
                  checked={checked}
                  onChange={() => repartir.toggleBill(index)}
                />
              }
              label={`Paiement ${index + 1}`}
            />
            {isRes && checked && (
              <Chip size="small" color="info" label="Solde" variant="outlined" />
            )}
            <TextField
              size="small"
              label="Montant"
              type="number"
              disabled={!checked}
              value={checked ? display : ''}
              onChange={e => repartir.setBillAmount(index, e.target.value)}
              onFocus={selectOnFocus}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{ width: 120, ml: 'auto' }}
              InputProps={{
                endAdornment: (
                  <Typography variant="caption" color="text.secondary">
                    €
                  </Typography>
                ),
              }}
            />
          </Box>
        );
      })}
      {!repartir.pickSharesValid && repartir.pickBillIds.size > 0 && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          La somme des parts doit égaler {formatCurrency(repartir.pickItemsTotal)}.
        </Alert>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={repartir.closeRepartirDialog}>Annuler</Button>
      <Button
        variant="contained"
        disabled={!repartir.pickSharesValid || !repartir.menuAnchor}
        onClick={repartir.applyRepartir}
      >
        Répartir
      </Button>
    </DialogActions>
  </Dialog>
);

export default SplitRepartirDialog;
