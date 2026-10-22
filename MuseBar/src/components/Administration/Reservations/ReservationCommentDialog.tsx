import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';

export type CommentDialogState = {
  id: number;
  status: 'confirmed' | 'on_hold' | 'refused';
  commentaire: string;
};

type Props = {
  commentDialog: CommentDialogState | null;
  onChange: (next: CommentDialogState | null) => void;
  onSubmit: () => void;
};

const ReservationCommentDialog: React.FC<Props> = ({ commentDialog, onChange, onSubmit }) => (
  <Dialog
    open={Boolean(commentDialog)}
    onClose={() => onChange(null)}
    fullWidth
    maxWidth="xs"
  >
    <DialogTitle>
      {commentDialog?.status === 'confirmed'
        ? 'Confirmer la réservation'
        : commentDialog?.status === 'refused'
          ? 'Refuser la réservation'
          : 'Mettre en attente'}
    </DialogTitle>
    <DialogContent>
      <TextField
        label="Commentaire"
        fullWidth
        multiline
        minRows={3}
        value={commentDialog?.commentaire || ''}
        onChange={(e) =>
          onChange(commentDialog ? { ...commentDialog, commentaire: e.target.value } : null)
        }
        helperText="Optionnel — visible dans l’e-mail au client"
        sx={{ mt: 1 }}
      />
      {!String(commentDialog?.commentaire || '').trim() && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Aucun commentaire : le client recevra le changement de statut sans information
          supplémentaire.
        </Alert>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={() => onChange(null)}>Annuler</Button>
      <Button
        variant="contained"
        color={
          commentDialog?.status === 'refused'
            ? 'error'
            : commentDialog?.status === 'on_hold'
              ? 'warning'
              : 'success'
        }
        onClick={onSubmit}
      >
        Envoyer
      </Button>
    </DialogActions>
  </Dialog>
);

export default ReservationCommentDialog;
