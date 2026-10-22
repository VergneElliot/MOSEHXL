import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

type Props = {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const PlanningResetDialog: React.FC<Props> = ({ open, busy, onClose, onConfirm }) => (
  <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
    <DialogTitle>Réinitialiser le planning</DialogTitle>
    <DialogContent>
      <Alert severity="warning" sx={{ mb: 2 }}>
        Cette action est irréversible.
      </Alert>
      <Typography>
        Êtes-vous sûr de vouloir supprimer la totalité de tous les plannings (toutes les
        vacations de cet établissement) ?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Les congés ne sont pas concernés — seuls les créneaux du planning (vacations) seront
        effacés.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button disabled={busy} onClick={onClose}>
        Annuler
      </Button>
      <Button color="error" variant="contained" disabled={busy} onClick={onConfirm}>
        Oui, tout supprimer
      </Button>
    </DialogActions>
  </Dialog>
);

export default PlanningResetDialog;
