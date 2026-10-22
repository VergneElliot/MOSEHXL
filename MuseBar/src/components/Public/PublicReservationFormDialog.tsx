import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import type { PublicReservationForm } from './publicReservationHours';

type Props = {
  open: boolean;
  submitting: boolean;
  selectedDayLabel: string;
  selectedTime: string;
  timeSlots: string[];
  form: PublicReservationForm;
  selectedDayKey: string;
  onClose: () => void;
  onTimeChange: (value: string) => void;
  onFormChange: (next: PublicReservationForm) => void;
  onSubmit: () => void;
};

const PublicReservationFormDialog: React.FC<Props> = ({
  open,
  submitting,
  selectedDayLabel,
  selectedTime,
  timeSlots,
  form,
  selectedDayKey,
  onClose,
  onTimeChange,
  onFormChange,
  onSubmit,
}) => (
  <Dialog open={open} onClose={() => !submitting && onClose()} fullWidth maxWidth="sm">
    <DialogTitle>Demande de réservation</DialogTitle>
    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
      <TextField
        label="Date"
        value={selectedDayLabel}
        fullWidth
        InputProps={{ readOnly: true }}
        helperText="Format français (jour / mois / année)"
      />
      <TextField
        select
        label="Heure"
        value={selectedTime}
        onChange={(e) => onTimeChange(e.target.value)}
        fullWidth
        required
        helperText="Horaires d’ouverture uniquement (24 h)"
      >
        {timeSlots.length === 0 ? (
          <MenuItem value="" disabled>
            Aucun créneau
          </MenuItem>
        ) : (
          timeSlots.map((t) => (
            <MenuItem key={t} value={t}>
              {t.replace(':', ' h ')}
            </MenuItem>
          ))
        )}
      </TextField>
      <TextField
        label="Nombre de personnes"
        type="number"
        inputProps={{ min: 1, max: 200 }}
        value={form.party_size}
        onChange={(e) => onFormChange({ ...form, party_size: Number(e.target.value) })}
        fullWidth
        required
      />
      <TextField
        label="Nom"
        value={form.customer_name}
        onChange={(e) => onFormChange({ ...form, customer_name: e.target.value })}
        fullWidth
        required
      />
      <TextField
        label="Email"
        type="email"
        value={form.customer_email}
        onChange={(e) => onFormChange({ ...form, customer_email: e.target.value })}
        fullWidth
        required
      />
      <TextField
        label="Téléphone"
        value={form.customer_phone}
        onChange={(e) => onFormChange({ ...form, customer_phone: e.target.value })}
        fullWidth
        required
      />
      <TextField
        label="Notes (optionnel)"
        multiline
        minRows={2}
        value={form.notes}
        onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
        fullWidth
      />
      <TextField
        label="Website"
        value={form.website}
        onChange={(e) => onFormChange({ ...form, website: e.target.value })}
        sx={{ position: 'absolute', left: -9999, opacity: 0, height: 0, width: 0 }}
        tabIndex={-1}
        autoComplete="off"
        inputProps={{ 'aria-hidden': true }}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={submitting}>
        Annuler
      </Button>
      <Button
        variant="contained"
        disabled={
          submitting ||
          !form.customer_name ||
          !form.customer_email ||
          !form.customer_phone ||
          !selectedDayKey ||
          !selectedTime
        }
        onClick={onSubmit}
      >
        {submitting ? 'Envoi…' : 'Envoyer la demande'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default PublicReservationFormDialog;
