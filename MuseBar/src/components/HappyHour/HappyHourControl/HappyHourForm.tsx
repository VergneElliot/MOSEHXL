/**
 * Happy Hour Form Component
 * Configuration form for happy hour settings
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  Button,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { HappyHourFormProps } from './types';

/**
 * Happy Hour Form Component
 */
export const HappyHourForm: React.FC<HappyHourFormProps> = ({
  settings,
  onSettingsChange,
  onSave,
  loading = false,
}) => {
  const handleFieldChange = (field: keyof typeof settings) => (
    event: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<{ value: unknown }>
  ) => {
    const target = event.target as HTMLInputElement;
    const value = target.type === 'checkbox' 
      ? target.checked
      : target.value;

    onSettingsChange({
      ...settings,
      [field]: value,
    });
  };

  const handleDiscountTypeChange = (event: any) => {
    onSettingsChange({
      ...settings,
      discountType: event.target.value as 'percentage' | 'fixed',
      discountValue: 0, // Reset value when type changes
    });
  };

  const handleSave = async () => {
    try {
      await onSave();
    } catch (error) {
      console.error('Error saving happy hour settings:', error);
    }
  };

  const validateSettings = () => {
    const startTime = new Date(`2000-01-01T${settings.startTime}:00`);
    const endTime = new Date(`2000-01-01T${settings.endTime}:00`);
    
    return {
      timeValid: startTime < endTime,
      discountValid: settings.discountValue > 0,
    };
  };

  const { timeValid, discountValid } = validateSettings();
  const isFormValid = timeValid && discountValid;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon />
          Configuration
        </Typography>

        <Grid container spacing={3}>
          {/* Enable/Disable Happy Hour */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.isEnabled}
                  onChange={handleFieldChange('isEnabled')}
                  disabled={loading}
                />
              }
              label="Activer l'Happy Hour automatique"
            />
          </Grid>

          {/* Time Settings */}
          <Grid item xs={6}>
            <TextField
              label="Heure de début"
              type="time"
              value={settings.startTime}
              onChange={handleFieldChange('startTime')}
              fullWidth
              disabled={loading || !settings.isEnabled}
              InputLabelProps={{ shrink: true }}
              error={!timeValid && settings.isEnabled}
              helperText={!timeValid ? 'L\'heure de début doit être antérieure à l\'heure de fin' : ''}
            />
          </Grid>
          
          <Grid item xs={6}>
            <TextField
              label="Heure de fin"
              type="time"
              value={settings.endTime}
              onChange={handleFieldChange('endTime')}
              fullWidth
              disabled={loading || !settings.isEnabled}
              InputLabelProps={{ shrink: true }}
              error={!timeValid && settings.isEnabled}
              helperText={!timeValid ? 'L\'heure de fin doit être postérieure à l\'heure de début' : ''}
            />
          </Grid>

          {/* Discount Settings */}
          <Grid item xs={6}>
            <FormControl fullWidth disabled={loading || !settings.isEnabled}>
              <InputLabel>Type de réduction par défaut</InputLabel>
              <Select
                value={settings.discountType}
                label="Type de réduction par défaut"
                onChange={handleDiscountTypeChange}
              >
                <MenuItem value="percentage">Pourcentage (%)</MenuItem>
                <MenuItem value="fixed">Montant fixe (€)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6}>
            <TextField
              label={
                settings.discountType === 'percentage'
                  ? 'Réduction par défaut (%)'
                  : 'Réduction par défaut (€)'
              }
              type="number"
              value={settings.discountValue}
              onChange={handleFieldChange('discountValue')}
              fullWidth
              disabled={loading || !settings.isEnabled}
              inputProps={{
                min: 0,
                max: settings.discountType === 'percentage' ? 100 : undefined,
                step: settings.discountType === 'percentage' ? 1 : 0.01,
              }}
              error={!discountValid && settings.isEnabled}
              helperText={
                !discountValid && settings.isEnabled
                  ? 'La valeur doit être supérieure à 0'
                  : settings.discountType === 'percentage'
                  ? 'Pourcentage de réduction (0-100%)'
                  : 'Montant de réduction en euros'
              }
            />
          </Grid>

          {/* Save Button */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={loading || !isFormValid}
                size="large"
              >
                {loading ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* Validation Messages */}
        {settings.isEnabled && !isFormValid && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Configuration invalide:</strong>
              <br />
              {!timeValid && '• Les horaires doivent être valides'}
              {!discountValid && '• La valeur de réduction doit être supérieure à 0'}
            </Typography>
          </Alert>
        )}

        {/* Information */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Configuration de l'Happy Hour:
          </Typography>
          <Typography variant="body2">
            • L'Happy Hour s'active automatiquement selon les horaires configurés<br />
            • La réduction par défaut s'applique aux produits sans réduction spécifique<br />
            • Vous pouvez personnaliser la réduction pour chaque produit individuellement<br />
            • Le contrôle manuel permet d'activer/désactiver temporairement
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default HappyHourForm;

