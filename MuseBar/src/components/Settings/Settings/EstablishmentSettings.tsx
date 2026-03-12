import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Box,
} from '@mui/material';
import { Business as BusinessIcon, Save as SaveIcon } from '@mui/icons-material';
import { BusinessSettingsProps, GeneralSettings, GeneralSettingsProps } from './types';

type EstablishmentSettingsProps = {
  businessInfoProps: BusinessSettingsProps;
  generalSettingsProps: GeneralSettingsProps;
};

export const EstablishmentSettings: React.FC<EstablishmentSettingsProps> = ({
  businessInfoProps,
  generalSettingsProps,
}) => {
  const { businessInfo, onUpdate: updateBusinessInfo, onSave: saveBusinessInfo, loading } =
    businessInfoProps;
  const {
    settings: generalSettings,
    onUpdate: updateGeneralSettings,
    onSave: saveGeneralSettings,
  } = generalSettingsProps;

  const handleBusinessFieldChange =
    (field: keyof typeof businessInfo) => (event: React.ChangeEvent<HTMLInputElement>) => {
      updateBusinessInfo({
        ...businessInfo,
        [field]: event.target.value,
      });
    };

  const handleGeneralFieldChange =
    (field: keyof GeneralSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
      updateGeneralSettings({
        ...generalSettings,
        [field]: event.target.value,
      });
    };

  const handleUnifiedFieldChange =
    (businessField: keyof typeof businessInfo, generalField: keyof GeneralSettings) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      updateBusinessInfo({
        ...businessInfo,
        [businessField]: value,
      });
      updateGeneralSettings({
        ...generalSettings,
        [generalField]: value,
      });
    };

  const handleSave = async () => {
    // Keep behavior explicit: save legal/business info (persists to DB) and run general settings save (currently a no-op)
    await saveBusinessInfo();
    await saveGeneralSettings();
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Paramètres de l&apos;établissement</Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Establishment Name */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Nom de l'établissement"
              fullWidth
              value={businessInfo.name}
              onChange={handleUnifiedFieldChange('name', 'barName')}
              disabled={loading}
              required
              helperText="Nom officiel de votre établissement"
            />
          </Grid>

          {/* Address */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Adresse"
              fullWidth
              value={businessInfo.address}
              onChange={handleUnifiedFieldChange('address', 'address')}
              disabled={loading}
              multiline
              rows={2}
              required
              helperText="Adresse complète de l'établissement"
            />
          </Grid>

          {/* Phone */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Téléphone"
              fullWidth
              value={businessInfo.phone}
              onChange={handleUnifiedFieldChange('phone', 'phone')}
              disabled={loading}
              required
              helperText="Numéro de téléphone principal"
            />
          </Grid>

          {/* Email */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={businessInfo.email}
              onChange={handleUnifiedFieldChange('email', 'email')}
              disabled={loading}
              required
              helperText="Adresse email de contact"
            />
          </Grid>

          {/* SIRET */}
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

          {/* TVA / Tax Identification */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Numéro de TVA"
              fullWidth
              value={businessInfo.taxIdentification}
              onChange={handleUnifiedFieldChange('taxIdentification', 'taxIdentification')}
              disabled={loading}
              required
              helperText="Numéro d'identification à la TVA"
            />
          </Grid>

          {/* Currency */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Devise"
              select
              fullWidth
              value={generalSettings.currency}
              onChange={handleGeneralFieldChange('currency')}
              disabled={loading}
              helperText="Devise utilisée pour les transactions"
            >
              <MenuItem value="EUR">Euro (€)</MenuItem>
              <MenuItem value="USD">Dollar ($)</MenuItem>
              <MenuItem value="GBP">Livre Sterling (£)</MenuItem>
            </TextField>
          </Grid>

          {/* Language */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Langue"
              select
              fullWidth
              value={generalSettings.language}
              onChange={handleGeneralFieldChange('language')}
              disabled={loading}
              helperText="Langue de l'interface utilisateur"
            >
              <MenuItem value="fr">Français</MenuItem>
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="es">Español</MenuItem>
            </TextField>
          </Grid>

          {/* Save Button */}
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

