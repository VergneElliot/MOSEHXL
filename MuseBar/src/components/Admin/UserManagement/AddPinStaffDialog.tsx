/**
 * Dialog to create a PIN-only staff member.
 */

import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { EstablishmentAssignableRole } from '../../../types/auth';

interface AddPinStaffDialogProps {
  open: boolean;
  firstName: string;
  lastName: string;
  pin: string;
  role: EstablishmentAssignableRole;
  onClose: () => void;
  onFirstName: (v: string) => void;
  onLastName: (v: string) => void;
  onPin: (v: string) => void;
  onRole: (v: EstablishmentAssignableRole) => void;
  onSubmit: () => void;
  canSubmit: boolean;
}

export const AddPinStaffDialog: React.FC<AddPinStaffDialogProps> = ({
  open,
  firstName,
  lastName,
  pin,
  role,
  onClose,
  onFirstName,
  onLastName,
  onPin,
  onRole,
  onSubmit,
  canSubmit,
}) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Ajouter un membre équipe (PIN)</DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Compte sans email/mot de passe — ouverture via badge PIN uniquement.
      </Typography>
      <TextField
        autoFocus
        margin="dense"
        label="Prénom"
        fullWidth
        variant="outlined"
        value={firstName}
        onChange={(e) => onFirstName(e.target.value)}
      />
      <TextField
        margin="dense"
        label="Nom"
        fullWidth
        variant="outlined"
        value={lastName}
        onChange={(e) => onLastName(e.target.value)}
      />
      <TextField
        margin="dense"
        label="PIN (2–8 chiffres)"
        type="password"
        fullWidth
        variant="outlined"
        value={pin}
        onChange={(e) => onPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
      />
      <FormControl fullWidth margin="dense" variant="outlined">
        <InputLabel id="add-user-role-label">Rôle</InputLabel>
        <Select<EstablishmentAssignableRole>
          labelId="add-user-role-label"
          label="Rôle"
          value={role}
          onChange={(e) => onRole(e.target.value as EstablishmentAssignableRole)}
        >
          <MenuItem value="staff">Staff</MenuItem>
          <MenuItem value="establishment_admin">
            Administrateur d&apos;établissement
          </MenuItem>
        </Select>
      </FormControl>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Annuler</Button>
      <Button onClick={onSubmit} disabled={!canSubmit} variant="contained">
        Ajouter
      </Button>
    </DialogActions>
  </Dialog>
);

export default AddPinStaffDialog;
