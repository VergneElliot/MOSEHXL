/**
 * Business Information Step - Business details form
 * Refactored to use modular hooks for validation and form management
 */

import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  InputAdornment,
  Tooltip,
  IconButton
} from '@mui/material';
import { 
  Business, 
  Email, 
  Phone, 
  LocationOn, 
  Receipt, 
  AccountBalance,
  Info
} from '@mui/icons-material';
import { SetupFormData } from '../../types/setup';
import { useBusinessValidation, useBusinessForm } from './BusinessInfoStep/hooks';

interface BusinessInfoStepProps {
  formData: SetupFormData;
  onUpdate: (updates: Partial<SetupFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const BusinessInfoStep: React.FC<BusinessInfoStepProps> = ({
  formData,
  onUpdate,
  onNext,
  onBack,
}) => {
  // Initialize hooks
  const validation = useBusinessValidation();
  const form = useBusinessForm({
    formData,
    onUpdate,
    onFieldError: validation.clearFieldError,
  });

  /**
   * Handle form validation and submission
   */
  const handleNext = () => {
    const isValid = validation.validateForm(formData);
    if (isValid) {
      onNext();
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    form.handleSubmit(e, handleNext);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
        Informations de l'Établissement
      </Typography>

      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Renseignez les informations légales de votre établissement
      </Typography>

      {validation.hasErrors() && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            Veuillez corriger les erreurs suivantes :
          </Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            {Object.values(validation.errors).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Business Name */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Nom de l'établissement"
            placeholder="Ex: Restaurant Le Petit Bistrot"
            value={formData.businessName || ''}
            onChange={form.handleInputChange('businessName')}
            error={!!validation.getFieldError('businessName')}
            helperText={validation.getFieldError('businessName')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Business color="primary" />
                </InputAdornment>
              ),
            }}
            required
          />
        </Grid>

        {/* Email */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email professionnel"
            type="email"
            placeholder="contact@restaurant.fr"
            value={formData.email || ''}
            onChange={form.handleInputChange('email')}
            error={!!validation.getFieldError('email')}
            helperText={validation.getFieldError('email')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email color="primary" />
                </InputAdornment>
              ),
            }}
            required
          />
        </Grid>

        {/* Phone */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Téléphone"
            placeholder="01 23 45 67 89"
            value={formData.phone || ''}
            onChange={form.handlePhoneChange}
            error={!!validation.getFieldError('phone')}
            helperText={validation.getFieldError('phone')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone color="primary" />
                </InputAdornment>
              ),
            }}
            required
          />
        </Grid>

        {/* Address */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Adresse complète"
            placeholder="123 Rue de la République, 75001 Paris"
            value={formData.address || ''}
            onChange={form.handleInputChange('address')}
            error={!!validation.getFieldError('address')}
            helperText={validation.getFieldError('address')}
            multiline
            rows={2}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                  <LocationOn color="primary" />
                </InputAdornment>
              ),
            }}
            required
          />
        </Grid>

        {/* SIRET */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Numéro SIRET"
            placeholder="123 456 789 01234"
            value={form.getSiretDisplayValue()}
            onChange={form.handleSiretChange}
            error={!!validation.getFieldError('siretNumber')}
            helperText={validation.getFieldError('siretNumber') || '14 chiffres sans espaces'}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Receipt color="primary" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Le SIRET identifie votre établissement auprès des administrations">
                    <IconButton size="small">
                      <Info fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
            required
          />
        </Grid>

        {/* TVA Number */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Numéro de TVA"
            placeholder="FR 12345678901"
            value={form.getTvaDisplayValue()}
            onChange={form.handleTvaChange}
            error={!!validation.getFieldError('tvaNumber')}
            helperText={validation.getFieldError('tvaNumber') || 'Format: FR + 11 chiffres'}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AccountBalance color="primary" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Numéro de TVA intracommunautaire français">
                    <IconButton size="small">
                      <Info fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
            required
          />
        </Grid>
      </Grid>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          variant="outlined"
          onClick={onBack}
          size="large"
        >
          Précédent
        </Button>
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          disabled={validation.hasErrors() && Object.keys(validation.errors).length > 0}
        >
          Suivant
        </Button>
      </Box>

      {/* Help Text */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          💡 <strong>Astuce :</strong> Ces informations sont nécessaires pour la conformité légale 
          et peuvent être modifiées ultérieurement dans les paramètres.
        </Typography>
      </Box>
    </Box>
  );
};