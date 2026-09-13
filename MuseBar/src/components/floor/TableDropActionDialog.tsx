import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

export type TableDropPrompt = {
  sourceLabel: string;
  targetLabel: string;
  canTransfer: boolean;
  canMerge: boolean;
};

type TableDropActionDialogProps = {
  open: boolean;
  prompt: TableDropPrompt | null;
  onClose: () => void;
  onTransfer: () => void;
  onMerge: () => void;
};

export function TableDropActionDialog({
  open,
  prompt,
  onClose,
  onTransfer,
  onMerge,
}: TableDropActionDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Déplacer l’addition</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Table <strong>{prompt?.sourceLabel ?? '—'}</strong> →{' '}
          <strong>{prompt?.targetLabel ?? '—'}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Transférer place l’addition sur une table libre. Fusionner regroupe deux additions
          occupées.
        </Typography>
        {!prompt?.canTransfer && !prompt?.canMerge && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Aucune action possible pour cette paire de tables.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="outlined" disabled={!prompt?.canTransfer} onClick={onTransfer}>
          Transférer
        </Button>
        <Button variant="contained" disabled={!prompt?.canMerge} onClick={onMerge}>
          Fusionner
        </Button>
      </DialogActions>
    </Dialog>
  );
}
