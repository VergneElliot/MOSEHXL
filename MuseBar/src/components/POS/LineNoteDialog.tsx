import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
} from '@mui/material';
import { LINE_NOTE_MAX_LENGTH } from '../../utils/lineItemNote';

interface LineNoteDialogProps {
  open: boolean;
  productName: string;
  initialNote?: string;
  onClose: () => void;
  onSave: (note: string) => void;
}

const LineNoteDialog: React.FC<LineNoteDialogProps> = ({
  open,
  productName,
  initialNote = '',
  onClose,
  onSave,
}) => {
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    if (open) setNote(initialNote);
  }, [open, initialNote]);

  const handleSave = () => {
    onSave(note.trim());
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: '1.2rem', pb: 1 }}>Note — {productName}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Note pour la cuisine ou le bar (ex. sans glaçons, sans citron). Imprimée sur le ticket de
          commande uniquement.
        </Typography>
        <TextField
          autoFocus
          label="Note libre"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          fullWidth
          multiline
          minRows={2}
          inputProps={{ maxLength: LINE_NOTE_MAX_LENGTH }}
          sx={{ '& .MuiInputBase-root': { fontSize: '1rem', minHeight: 52 } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} size="large" sx={{ minHeight: 48 }}>
          Annuler
        </Button>
        <Button variant="contained" onClick={handleSave} size="large" sx={{ minHeight: 48, px: 3 }}>
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LineNoteDialog;
