/**
 * Business Settings Component
 * Handles business information like SIRET, tax identification, etc.
 */

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

/**
 * Business Settings Component
 */
export const BusinessSettings: React.FC<BusinessSettingsProps> = ({
  businessInfo,
  onUpdate,
  onSave,
  loading = false,
  message = null,
}) => {
  const handleFieldChange = (field: keyof typeof businessInfo) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onUpdate({
      ...businessInfo,
      [field]: event.target.value,
    });
  };

  const handleSave = async () => {
    try {
      await onSave();
    } catch (error) {
      console.error('Error saving business info:', error);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Informations du Bar
          </Typography>
        </Box>

        {/* Status Message */}
        {message && (
          <Alert
            severity={message.includes('succès') ? 'success' : 'error'}
            sx={{ mb: 3 }}
          >
            {message}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Business Name */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Nom de l'établissement"
              fullWidth
              value={businessInfo.name}
              onChange={handleFieldChange('name')}
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
              onChange={handleFieldChange('address')}
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
              onChange={handleFieldChange('phone')}
              disabled={loading}
              required
              helperText="Numéro de téléphone de l'établissement"
            />
          </Grid>

          {/* Email */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={businessInfo.email}
              onChange={handleFieldChange('email')}
              disabled={loading}
              required
              helperText="Adresse email officielle"
            />
          </Grid>

          {/* SIRET */}
          <Grid item xs={12} md={6}>
            <TextField
              label="SIRET"
              fullWidth
              value={businessInfo.siret}
              onChange={handleFieldChange('siret')}
              disabled={loading}
              required
              helperText="Numéro SIRET de l'établissement (14 chiffres)"
              inputProps={{
                maxLength: 14,
                pattern: '[0-9]{14}',
              }}
            />
          </Grid>

          {/* Tax Identification */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Numéro de TVA"
              fullWidth
              value={businessInfo.taxIdentification}
              onChange={handleFieldChange('taxIdentification')}
              disabled={loading}
              required
              helperText="Numéro d'identification à la TVA"
            />
          </Grid>

          {/* Legal Information */}
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Informations légales importantes:
              </Typography>
              <Typography variant="body2">
                • Ces informations apparaissent sur tous les reçus et factures<br />
                • Le SIRET et le numéro de TVA sont obligatoires pour la conformité fiscale<br />
                • Vérifiez l'exactitude de ces données avant de les sauvegarder
              </Typography>
            </Alert>
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
                {loading ? 'Sauvegarde...' : 'Sauvegarder les Informations'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default BusinessSettings;

