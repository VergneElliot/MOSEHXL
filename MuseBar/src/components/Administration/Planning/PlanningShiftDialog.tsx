import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import { ParisDateTimeField } from '../../common/ParisDateTimeField';
import type { PlanningStaffMember, ShiftForm, ShiftRecurrence } from './planningTypes';

type Props = {
  open: boolean;
  form: ShiftForm | null;
  staff: PlanningStaffMember[];
  busy: boolean;
  seriesSiblingCount: number;
  nameOf: (id: number) => string;
  onClose: () => void;
  onChange: (next: ShiftForm) => void;
  onSave: () => void;
  onDelete: () => void;
};

const PlanningShiftDialog: React.FC<Props> = ({
  open,
  form,
  staff,
  busy,
  seriesSiblingCount,
  nameOf,
  onClose,
  onChange,
  onSave,
  onDelete,
}) => {
  const update = (patch: Partial<ShiftForm>) => {
    if (!form) return;
    onChange({ ...form, ...patch });
  };

  return (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>{form?.id ? 'Modifier' : 'Nouvelle'} vacation</DialogTitle>
    <DialogContent
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        // Avoid clipping floating InputLabel on the first field (MUI DialogContent overflow).
        overflow: 'visible',
        pt: 2.5,
      }}
    >
      <TextField
        select
        label="Employé"
        value={form?.user_id ?? ''}
        onChange={(e) => update({ user_id: Number(e.target.value) })}
        fullWidth
        InputLabelProps={{ shrink: true }}
      >
        {staff.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {nameOf(s.id)}
          </MenuItem>
        ))}
      </TextField>
      <ParisDateTimeField
        dateLabel="Début — date (jj/mm/aaaa)"
        timeLabel="Début — heure (HH:mm)"
        value={form?.starts_at || ''}
        onChange={(next) => update({ starts_at: next })}
      />
      <ParisDateTimeField
        dateLabel="Fin — date (jj/mm/aaaa)"
        timeLabel="Fin — heure (HH:mm)"
        value={form?.ends_at || ''}
        onChange={(next) => update({ ends_at: next })}
      />
      {!form?.id && (
        <TextField
          select
          label="Fréquence"
          value={form?.recurrence ?? 'once'}
          onChange={(e) =>
            update({
              recurrence: e.target.value as ShiftRecurrence,
            })
          }
          fullWidth
          InputLabelProps={{ shrink: true }}
          helperText="Les e-mails partent à l’enregistrement du planning (bouton Enregistrer les modifications)."
        >
          <MenuItem value="once">Une seule fois</MenuItem>
          <MenuItem value="daily">Tous les jours</MenuItem>
          <MenuItem value="weekly">Toutes les semaines</MenuItem>
          <MenuItem value="monthly">Tous les mois</MenuItem>
          <MenuItem value="yearly">Tous les ans</MenuItem>
        </TextField>
      )}
      {form?.id && form.series_id && (
        <Alert severity="info">
          Cette vacation appartient à une série ({seriesSiblingCount || 'plusieurs'} occurrence
          {seriesSiblingCount > 1 ? 's' : ''}). À l’enregistrement ou à la suppression, vous
          pourrez choisir d’appliquer le changement à toute la série.
        </Alert>
      )}
      <TextField
        label="Libellé"
        value={form?.label || ''}
        onChange={(e) => update({ label: e.target.value })}
        fullWidth
      />
    </DialogContent>
    <DialogActions>
      {form?.id && (
        <Button color="error" sx={{ mr: 'auto' }} disabled={busy} onClick={onDelete}>
          Supprimer
        </Button>
      )}
      <Button onClick={onClose} disabled={busy}>
        Annuler
      </Button>
      <Button variant="contained" disabled={busy} onClick={onSave}>
        {form?.id ? 'Appliquer' : 'Ajouter'}
      </Button>
    </DialogActions>
  </Dialog>
  );
};

export default PlanningShiftDialog;
