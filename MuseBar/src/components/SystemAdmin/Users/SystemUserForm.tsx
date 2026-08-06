import React from 'react';
import { Grid, TextField, Typography } from '@mui/material';

export interface SystemUserFormData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: 'system_admin';
}

interface SystemUserFormProps {
  formData: SystemUserFormData;
  onChange: (data: SystemUserFormData) => void;
}

export const SystemUserForm: React.FC<SystemUserFormProps> = ({ formData, onChange }) => {
  const handleChange =
    (field: keyof SystemUserFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...formData,
        [field]: event.target.value,
      });
    };

  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Prénom"
          value={formData.first_name}
          onChange={handleChange('first_name')}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Nom"
          value={formData.last_name}
          onChange={handleChange('last_name')}
          required
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={formData.email}
          onChange={handleChange('email')}
          required
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Mot de passe temporaire"
          type="password"
          value={formData.password}
          onChange={handleChange('password')}
          required
          helperText="Doit respecter la politique de mot de passe (longueur et complexité)."
        />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="body2" color="text.secondary">
          Le compte sera créé avec le rôle Administrateur système.
        </Typography>
      </Grid>
    </Grid>
  );
};
