import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

export type ClosureType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL';

interface CreateClosureDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: { date: string; type: ClosureType; force?: boolean }) => Promise<void>;
  creating: boolean;
  selectedDate: string;
  selectedClosureType: ClosureType;
  onDateChange: (date: string) => void;
  onClosureTypeChange: (type: ClosureType) => void;
  disableForceCreation?: boolean;
}

const CreateClosureDialog: React.FC<CreateClosureDialogProps> = ({
  open,
  onClose,
  onCreate,
  creating,
  selectedDate,
  selectedClosureType,
  onDateChange,
  onClosureTypeChange,
  disableForceCreation = true,
}) => {
  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [forceCreation, setForceCreation] = useState(false);

  const canCreate = !creating && selectedDate.trim().length > 0 && !!selectedClosureType;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Créer un bulletin de clôture</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FormControl fullWidth>
            <TextField
              select
              label="Type"
              value={selectedClosureType}
              onChange={e => onClosureTypeChange(e.target.value as ClosureType)}
              size="small"
            >
              <MenuItem value="DAILY">Journalière</MenuItem>
              <MenuItem value="WEEKLY">Hebdomadaire</MenuItem>
              <MenuItem value="MONTHLY">Mensuelle</MenuItem>
              <MenuItem value="ANNUAL">Annuelle</MenuItem>
            </TextField>
          </FormControl>

          <TextField
            label="Date de clôture"
            type="date"
            value={selectedDate}
            onChange={e => onDateChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            fullWidth
          />

          <Tooltip
            title={
              disableForceCreation
                ? 'A activer plus tard après validation légale et backend (force de création).'
                : 'Cette option force la création même si un bulletin existe déjà.'
            }
          >
            <Box>
              <FormControlLabel
                disabled={disableForceCreation}
                control={
                  <Checkbox
                    checked={forceCreation}
                    onChange={(e) => setForceCreation(e.target.checked)}
                  />
                }
                label="Forcer la création (crée un bulletin correctif, sans supprimer l'ancien)"
              />
            </Box>
          </Tooltip>

          <Typography variant="caption" color="textSecondary">
            La clôture crée un bulletin immuable pour la période sélectionnée.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={creating}>
          Annuler
        </Button>
        <Button
          onClick={() => onCreate({ date: selectedDate || todayISO, type: selectedClosureType, force: forceCreation })}
          variant="contained"
          color="primary"
          disabled={!canCreate}
        >
          {creating ? 'Création…' : 'Créer la clôture'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateClosureDialog;

