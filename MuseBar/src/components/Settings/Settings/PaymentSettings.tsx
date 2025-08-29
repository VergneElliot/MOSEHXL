/**
 * Payment Settings Component
 * Handles payment method configuration and tax settings
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
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';
import { Payment as PaymentIcon, Save as SaveIcon } from '@mui/icons-material';
import { PaymentSettingsProps } from './types';

/**
 * Payment Settings Component
 */
export const PaymentSettings: React.FC<PaymentSettingsProps> = ({
  paymentSettings,
  onUpdate,
  onSave,
  loading = false,
}) => {
  const handleFieldChange = (field: keyof typeof paymentSettings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.type === 'checkbox' 
      ? event.target.checked 
      : event.target.type === 'number' 
        ? parseFloat(event.target.value) || 0
        : event.target.value;

    onUpdate({
      ...paymentSettings,
      [field]: value,
    });
  };

  const handleSave = async () => {
    try {
      await onSave();
    } catch (error) {
      console.error('Error saving payment settings:', error);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <PaymentIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Paramètres de Paiement
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Payment Methods */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Méthodes de Paiement Acceptées
            </Typography>
            <Box sx={{ ml: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={paymentSettings.acceptCash}
                    onChange={handleFieldChange('acceptCash')}
                    disabled={loading}
                  />
                }
                label="Espèces"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={paymentSettings.acceptCard}
                    onChange={handleFieldChange('acceptCard')}
                    disabled={loading}
                  />
                }
                label="Carte Bancaire"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={paymentSettings.acceptChecks}
                    onChange={handleFieldChange('acceptChecks')}
                    disabled={loading}
                  />
                }
                label="Chèques"
              />
            </Box>
          </Grid>

          {/* Tax Rate */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Taux de TVA (%)"
              type="number"
              fullWidth
              value={paymentSettings.taxRate}
              onChange={handleFieldChange('taxRate')}
              disabled={loading}
              inputProps={{
                min: 0,
                max: 100,
                step: 0.1,
              }}
              helperText="Taux de TVA appliqué par défaut"
            />
          </Grid>

          {/* Discount Settings */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              Paramètres de Remise
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={paymentSettings.discountEnabled}
                  onChange={handleFieldChange('discountEnabled')}
                  disabled={loading}
                />
              }
              label="Autoriser les remises"
            />
          </Grid>

          {paymentSettings.discountEnabled && (
            <Grid item xs={12} md={6}>
              <TextField
                label="Remise maximale (%)"
                type="number"
                fullWidth
                value={paymentSettings.maxDiscountPercent}
                onChange={handleFieldChange('maxDiscountPercent')}
                disabled={loading}
                inputProps={{
                  min: 0,
                  max: 100,
                  step: 1,
                }}
                helperText="Pourcentage de remise maximum autorisé"
              />
            </Grid>
          )}

          {/* Information Alert */}
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Configuration des paiements:
              </Typography>
              <Typography variant="body2">
                • Au moins une méthode de paiement doit être activée<br />
                • Le taux de TVA doit correspondre à la législation en vigueur<br />
                • Les remises sont appliquées avant le calcul de la TVA<br />
                • Ces paramètres affectent tous les nouveaux ordres
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
                disabled={loading || (!paymentSettings.acceptCash && !paymentSettings.acceptCard && !paymentSettings.acceptChecks)}
                size="large"
              >
                {loading ? 'Sauvegarde...' : 'Sauvegarder les Paramètres'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default PaymentSettings;

