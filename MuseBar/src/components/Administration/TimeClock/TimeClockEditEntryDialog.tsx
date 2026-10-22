import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { ParisDateTimeField } from '../../common/ParisDateTimeField';

type Props = {
  open: boolean;
  editIn: string;
  editOut: string;
  editNote: string;
  onClose: () => void;
  onEditInChange: (value: string) => void;
  onEditOutChange: (value: string) => void;
  onEditNoteChange: (value: string) => void;
  onSave: () => void;
};

const TimeClockEditEntryDialog: React.FC<Props> = ({
  open,
  editIn,
  editOut,
  editNote,
  onClose,
  onEditInChange,
  onEditOutChange,
  onEditNoteChange,
  onSave,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Corriger le pointage</DialogTitle>
    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
      <ParisDateTimeField
        dateLabel="Entrée — date"
        timeLabel="Entrée — heure"
        value={editIn}
        onChange={onEditInChange}
      />
      <ParisDateTimeField
        dateLabel="Sortie — date (vide = ouvert)"
        timeLabel="Sortie — heure"
        value={editOut}
        onChange={onEditOutChange}
      />
      <TextField
        label="Note"
        value={editNote}
        onChange={(e) => onEditNoteChange(e.target.value)}
        fullWidth
        multiline
        rows={2}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Annuler</Button>
      <Button variant="contained" onClick={onSave}>
        Enregistrer
      </Button>
    </DialogActions>
  </Dialog>
);

export default TimeClockEditEntryDialog;
