import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

type Props = {
  open: boolean;
  dirtyCount: number;
  onClose: () => void;
  onConfirm: () => void;
};

const PlanningDiscardDialog: React.FC<Props> = ({ open, dirtyCount, onClose, onConfirm }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Annuler les modifications ?</DialogTitle>
    <DialogContent>
      <Typography variant="body2">
        Les {dirtyCount} modification(s) non enregistrée(s) seront perdues.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Retour</Button>
      <Button color="error" variant="contained" onClick={onConfirm}>
        Annuler les modifications
      </Button>
    </DialogActions>
  </Dialog>
);

export default PlanningDiscardDialog;
