import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Alert,
} from '@mui/material';
import { Business as BusinessIcon, Save as SaveIcon } from '@mui/icons-material';
import { BusinessSettingsProps } from './types';

type EstablishmentSettingsProps = {
  businessInfoProps: BusinessSettingsProps;
};

export const EstablishmentSettings: React.FC<EstablishmentSettingsProps> = ({
  businessInfoProps,
}) => {
  const {
    businessInfo,
    onUpdate: updateBusinessInfo,
    onSave: saveBusinessInfo,
    loading,
    message,
  } = businessInfoProps;

  const handleBusinessFieldChange =
    (field: keyof typeof businessInfo) => (event: React.ChangeEvent<HTMLInputElement>) => {
      updateBusinessInfo({
        ...businessInfo,
        [field]: event.target.value,
      });
    };

  const handleSave = async () => {
    await saveBusinessInfo();
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Paramètres de l&apos;établissement</Typography>
        </Box>

        {message && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Nom de l'établissement"
              fullWidth
              value={businessInfo.name}
              onChange={handleBusinessFieldChange('name')}
              disabled={loading}
              required
              helperText="Nom officiel de votre établissement"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Adresse"
              fullWidth
              value={businessInfo.address}
              onChange={handleBusinessFieldChange('address')}
              disabled={loading}
              multiline
              rows={2}
              required
              helperText="Adresse complète de l'établissement"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Téléphone"
              fullWidth
              value={businessInfo.phone}
              onChange={handleBusinessFieldChange('phone')}
              disabled={loading}
              required
              helperText="Numéro de téléphone principal"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={businessInfo.email}
              onChange={handleBusinessFieldChange('email')}
              disabled={loading}
              required
              helperText="Adresse email de contact"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="SIRET"
              fullWidth
              value={businessInfo.siret}
              onChange={handleBusinessFieldChange('siret')}
              disabled={loading}
              required
              helperText="Numéro SIRET de l'établissement (14 chiffres)"
              inputProps={{
                maxLength: 14,
                pattern: '[0-9]{14}',
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Numéro de TVA"
              fullWidth
              value={businessInfo.taxIdentification}
              onChange={handleBusinessFieldChange('taxIdentification')}
              disabled={loading}
              required
              helperText="Numéro d'identification à la TVA"
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={loading}
                size="large"
              >
                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default EstablishmentSettings;
