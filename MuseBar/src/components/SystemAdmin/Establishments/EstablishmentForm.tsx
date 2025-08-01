import React from 'react';
import { Grid, TextField } from '@mui/material';
import { CreateEstablishmentRequest } from '../../../types/system';

interface EstablishmentFormProps {
  formData: CreateEstablishmentRequest;
  onChange: (data: CreateEstablishmentRequest) => void;
}

export const EstablishmentForm: React.FC<EstablishmentFormProps> = ({
  formData,
  onChange
}) => {
  const handleChange = (field: keyof CreateEstablishmentRequest) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onChange({
      ...formData,
      [field]: event.target.value
    });
  };

  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Nom de l'établissement"
          value={formData.name}
          onChange={handleChange('name')}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Email de contact"
          type="email"
          value={formData.email}
          onChange={handleChange('email')}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Téléphone"
          value={formData.phone}
          onChange={handleChange('phone')}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Email du propriétaire"
          type="email"
          value={formData.owner_email}
          onChange={handleChange('owner_email')}
          required
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Adresse"
          multiline
          rows={2}
          value={formData.address}
          onChange={handleChange('address')}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Numéro TVA (optionnel)"
          value={formData.tva_number}
          onChange={handleChange('tva_number')}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Numéro SIRET (optionnel)"
          value={formData.siret_number}
          onChange={handleChange('siret_number')}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          select
          label="Plan d'abonnement"
          value={formData.subscription_plan}
          onChange={handleChange('subscription_plan')}
          SelectProps={{ native: true }}
        >
          <option value="basic">Basic</option>
          <option value="premium">Premium</option>
        </TextField>
      </Grid>
    </Grid>
  );
};