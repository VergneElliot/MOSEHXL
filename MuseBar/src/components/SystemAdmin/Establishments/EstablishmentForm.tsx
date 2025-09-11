import React from 'react';
import { Grid, TextField, MenuItem } from '@mui/material';
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
          label="Téléphone"
          value={formData.phone}
          onChange={handleChange('phone')}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Email de l'établissement"
          type="email"
          value={formData.email}
          onChange={handleChange('email')}
          required
          helperText="Email principal de l'établissement"
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
          helperText="Email pour recevoir l'invitation de configuration"
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
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          select
          label="Type d'activité"
          value={formData.business_type || 'other'}
          onChange={handleChange('business_type')}
        >
          <MenuItem value="restaurant">Restaurant</MenuItem>
          <MenuItem value="bar">Bar</MenuItem>
          <MenuItem value="cafe">Café</MenuItem>
          <MenuItem value="retail">Commerce de détail</MenuItem>
          <MenuItem value="other">Autre</MenuItem>
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          select
          label="Plan d'abonnement"
          value={formData.subscription_plan || 'basic'}
          onChange={handleChange('subscription_plan')}
        >
          <MenuItem value="basic">Basic</MenuItem>
          <MenuItem value="premium">Premium</MenuItem>
          <MenuItem value="enterprise">Enterprise</MenuItem>
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Fuseau horaire"
          value={formData.timezone || 'Europe/Paris'}
          onChange={handleChange('timezone')}
          helperText="Ex: Europe/Paris, America/New_York"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          select
          label="Langue"
          value={formData.language || 'fr'}
          onChange={handleChange('language')}
        >
          <MenuItem value="fr">Français</MenuItem>
          <MenuItem value="en">English</MenuItem>
          <MenuItem value="es">Español</MenuItem>
          <MenuItem value="de">Deutsch</MenuItem>
          <MenuItem value="it">Italiano</MenuItem>
        </TextField>
      </Grid>
    </Grid>
  );
};