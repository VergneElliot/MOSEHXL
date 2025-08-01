import React from 'react';
import { Grid, TextField, Typography, FormControlLabel, Switch } from '@mui/material';

interface SystemUserFormData {
  email: string;
  first_name: string;
  last_name: string;
  role: 'system_admin' | 'system_operator';
  permissions: string[];
}

interface SystemUserFormProps {
  formData: SystemUserFormData;
  onChange: (data: SystemUserFormData) => void;
}

const availablePermissions = [
  'establishments:create',
  'establishments:read', 
  'establishments:update',
  'establishments:delete',
  'users:create',
  'users:read',
  'users:update', 
  'users:delete',
  'system:monitoring',
  'system:logs',
  'billing:read',
  'billing:update'
];

export const SystemUserForm: React.FC<SystemUserFormProps> = ({
  formData,
  onChange
}) => {
  const handleChange = (field: keyof SystemUserFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onChange({
      ...formData,
      [field]: event.target.value
    });
  };

  const handlePermissionToggle = (permission: string) => {
    const newPermissions = formData.permissions.includes(permission)
      ? formData.permissions.filter(p => p !== permission)
      : [...formData.permissions, permission];
    
    onChange({ ...formData, permissions: newPermissions });
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
          select
          label="Rôle"
          value={formData.role}
          onChange={handleChange('role')}
          SelectProps={{ native: true }}
        >
          <option value="system_operator">Opérateur Système</option>
          <option value="system_admin">Administrateur Système</option>
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Permissions
        </Typography>
        <Grid container spacing={1}>
          {availablePermissions.map((permission) => (
            <Grid item xs={12} sm={6} key={permission}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.permissions.includes(permission)}
                    onChange={() => handlePermissionToggle(permission)}
                    size="small"
                  />
                }
                label={permission}
              />
            </Grid>
          ))}
        </Grid>
      </Grid>
    </Grid>
  );
};