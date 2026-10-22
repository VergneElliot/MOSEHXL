import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';

type Props = {
  renamePlan: { id: number; name: string } | null;
  onChangeName: (name: string) => void;
  onClose: () => void;
  onSave: () => void;
};

const FloorPlanRenameDialog: React.FC<Props> = ({
  renamePlan,
  onChangeName,
  onClose,
  onSave,
}) => (
  <Dialog open={renamePlan != null} onClose={onClose}>
    <DialogTitle>Renommer le plan</DialogTitle>
    <DialogContent>
      <TextField
        autoFocus
        fullWidth
        margin="dense"
        label="Nom"
        value={renamePlan?.name ?? ''}
        onChange={(e) => onChangeName(e.target.value)}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Annuler</Button>
      <Button variant="contained" onClick={() => void onSave()}>
        Enregistrer
      </Button>
    </DialogActions>
  </Dialog>
);

export default FloorPlanRenameDialog;
