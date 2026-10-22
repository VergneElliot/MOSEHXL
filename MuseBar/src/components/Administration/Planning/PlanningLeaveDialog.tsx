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
import type { LeaveCountPreviewDto, StaffLeaveDto } from '../../../services/api/adminSpace';
import { ParisDateField } from '../../common/ParisDateTimeField';
import { LEAVE_TYPE_LABELS, type LeaveForm, type PlanningStaffMember } from './planningTypes';

type Props = {
  open: boolean;
  leaveForm: LeaveForm | null;
  leavePreview: LeaveCountPreviewDto | null;
  staff: PlanningStaffMember[];
  nameOf: (id: number) => string;
  onClose: () => void;
  onChange: (next: LeaveForm) => void;
  onSubmit: () => void;
};

const PlanningLeaveDialog: React.FC<Props> = ({
  open,
  leaveForm,
  leavePreview,
  staff,
  nameOf,
  onClose,
  onChange,
  onSubmit,
}) => {
  const update = (patch: Partial<LeaveForm>) => {
    if (!leaveForm) return;
    onChange({ ...leaveForm, ...patch });
  };

  return (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>Demande de congé</DialogTitle>
    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5, overflow: 'visible' }}>
      <TextField
        select
        label="Employé"
        value={leaveForm?.user_id ?? ''}
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
      <TextField
        select
        label="Type"
        value={leaveForm?.leave_type ?? 'paid_leave'}
        onChange={(e) =>
          update({
            leave_type: e.target.value as StaffLeaveDto['leave_type'],
          })
        }
        fullWidth
        InputLabelProps={{ shrink: true }}
      >
        {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => (
          <MenuItem key={k} value={k}>
            {v}
          </MenuItem>
        ))}
      </TextField>
      <ParisDateField
        label="Du (jj/mm/aaaa)"
        value={leaveForm?.starts_on ?? ''}
        onChange={(ymd) => update({ starts_on: ymd })}
      />
      <ParisDateField
        label="Au (jj/mm/aaaa)"
        value={leaveForm?.ends_on ?? ''}
        onChange={(ymd) => update({ ends_on: ymd })}
      />
      <TextField
        label="Motif (optionnel)"
        value={leaveForm?.note ?? ''}
        onChange={(e) => update({ note: e.target.value })}
        fullWidth
        multiline
        rows={2}
      />
      {leavePreview && (
        <Alert severity="info">
          <strong>{leavePreview.counted_days} jour(s) compté(s)</strong> pour le décompte CP
          {leavePreview.return_on ? ` · reprise le ${leavePreview.return_on}` : ''}.
          {leavePreview.excluded_public_holidays.length > 0 && (
            <>
              {' '}
              Jours fériés dans la période (non comptés) :{' '}
              {leavePreview.excluded_public_holidays.map((h) => `${h.name} (${h.date})`).join(', ')}.
            </>
          )}
        </Alert>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Annuler</Button>
      <Button variant="contained" onClick={onSubmit}>
        Enregistrer (approuvé)
      </Button>
    </DialogActions>
  </Dialog>
  );
};

export default PlanningLeaveDialog;
