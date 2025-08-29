/**
 * General Settings Component
 * Handles general application settings like language, currency, etc.
 */

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
import { Settings as SettingsIcon, Save as SaveIcon } from '@mui/icons-material';
import { GeneralSettingsProps } from './types';

/**
 * Currency options
 */
const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'Dollar ($)' },
  { value: 'GBP', label: 'Livre Sterling (£)' },
];

/**
 * Language options
 */
const LANGUAGE_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

/**
 * General Settings Component
 */
export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  settings,
  onUpdate,
  onSave,
  loading = false,
}) => {
  const handleFieldChange = (field: keyof typeof settings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onUpdate({
      ...settings,
      [field]: event.target.value,
    });
  };

  const handleSave = async () => {
    try {
      await onSave();
      // Success feedback could be added here
    } catch (error) {
      // Error handling could be enhanced
      console.error('Error saving general settings:', error);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Paramètres Généraux
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Bar Name */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Nom du Bar"
              fullWidth
              value={settings.barName}
              onChange={handleFieldChange('barName')}
              disabled={loading}
              helperText="Le nom de votre établissement"
            />
          </Grid>

          {/* Address */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Adresse"
              fullWidth
              value={settings.address}
              onChange={handleFieldChange('address')}
              disabled={loading}
              multiline
              rows={2}
              helperText="Adresse complète de l'établissement"
            />
          </Grid>

          {/* Phone */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Téléphone"
              fullWidth
              value={settings.phone}
              onChange={handleFieldChange('phone')}
              disabled={loading}
              helperText="Numéro de téléphone principal"
            />
          </Grid>

          {/* Email */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={settings.email}
              onChange={handleFieldChange('email')}
              disabled={loading}
              helperText="Adresse email de contact"
            />
          </Grid>

          {/* Tax Identification */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Numéro de TVA"
              fullWidth
              value={settings.taxIdentification}
              onChange={handleFieldChange('taxIdentification')}
              disabled={loading}
              helperText="Numéro d'identification fiscale"
            />
          </Grid>

          {/* Currency */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Devise"
              select
              fullWidth
              value={settings.currency}
              onChange={handleFieldChange('currency')}
              disabled={loading}
              helperText="Devise utilisée pour les transactions"
            >
              {CURRENCY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Language */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Langue"
              select
              fullWidth
              value={settings.language}
              onChange={handleFieldChange('language')}
              disabled={loading}
              helperText="Langue de l'interface utilisateur"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
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

export default GeneralSettings;

