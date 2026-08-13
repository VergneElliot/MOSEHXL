/**
 * Simple "Faire de la monnaie" panel (card → cash same amount).
 */

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  TextField,
  Typography,
} from '@mui/material';
import { SwapHoriz as ChangeIcon } from '@mui/icons-material';

export interface ChangeMakingPanelProps {
  onSubmit: (amount: number) => Promise<void>;
  onClose: () => void;
}

export const ChangeMakingPanel: React.FC<ChangeMakingPanelProps> = ({ onSubmit, onClose }) => {
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = parseFloat(amount.replace(',', '.'));
  const isValid = Number.isFinite(parsed) && parsed > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(parsed);
      setAmount('');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de l’opération');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 420 }}>
      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ChangeIcon />
        Faire de la monnaie
      </Typography>
      <Alert severity="info">
        Le client paie un montant par carte et reçoit le même montant en espèces. Cela n’est pas
        une vente : l’opération ajuste uniquement les totaux carte / espèces du jour.
      </Alert>
      <TextField
        autoFocus
        label="Montant (€)"
        type="number"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        inputProps={{ min: 0.01, step: 0.01 }}
        error={amount !== '' && !isValid}
        helperText={amount !== '' && !isValid ? 'Montant strictement positif requis' : undefined}
        fullWidth
      />
      {error && <Alert severity="error">{error}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onClose} disabled={submitting}>
          Annuler
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={!isValid || submitting}>
          {submitting ? 'Enregistrement…' : 'Valider'}
        </Button>
      </Box>
    </Box>
  );
};

export default ChangeMakingPanel;
