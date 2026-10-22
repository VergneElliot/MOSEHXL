import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import type { SeriesScopeAction } from './planningTypes';

type Props = {
  open: boolean;
  busy: boolean;
  seriesScopeAction: SeriesScopeAction | null;
  seriesSiblingCount: number;
  onClose: () => void;
  onApplyOne: () => void;
  onApplySeries: () => void;
};

const PlanningSeriesScopeDialog: React.FC<Props> = ({
  open,
  busy,
  seriesScopeAction,
  seriesSiblingCount,
  onClose,
  onApplyOne,
  onApplySeries,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>
      {seriesScopeAction === 'delete' ? 'Supprimer la série ?' : 'Modifier la série ?'}
    </DialogTitle>
    <DialogContent>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Cette vacation fait partie d’une série récurrente
        {seriesSiblingCount > 0 ? ` (${seriesSiblingCount} occurrences visibles)` : ''}.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {seriesScopeAction === 'delete'
          ? 'Choisissez de supprimer uniquement cette occurrence, ou toutes les vacations liées.'
          : 'Choisissez d’appliquer les modifications uniquement à cette occurrence, ou à toutes les vacations liées (horaires décalés de la même façon).'}
      </Typography>
    </DialogContent>
    <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
      <Button disabled={busy} onClick={onClose}>
        Annuler
      </Button>
      <Button disabled={busy} variant="outlined" onClick={onApplyOne}>
        Cette vacation seulement
      </Button>
      <Button
        disabled={busy}
        variant="contained"
        color={seriesScopeAction === 'delete' ? 'error' : 'primary'}
        onClick={onApplySeries}
      >
        Toute la série
      </Button>
    </DialogActions>
  </Dialog>
);

export default PlanningSeriesScopeDialog;
