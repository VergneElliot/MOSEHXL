/**
 * Business Information Step - Business details form
 */

import React, { useState } from 'react';
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
  onBack
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }
    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Business address is required';
    }

    // Optional field validation
    if (formData.tvaNumber && !/^FR\d{11}$/.test(formData.tvaNumber.replace(/\s/g, ''))) {
      newErrors.tvaNumber = 'TVA number format: FR + 11 digits (e.g., FR12345678901)';
    }
    if (formData.siretNumber && !/^\d{14}$/.test(formData.siretNumber.replace(/\s/g, ''))) {
      newErrors.siretNumber = 'SIRET number must be exactly 14 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onNext();
    }
  };

  const handleInputChange = (field: keyof SetupFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    onUpdate({ [field]: value });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Format TVA number as user types
  const handleTvaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s/g, '').toUpperCase();
    if (value && !value.startsWith('FR')) {
      value = 'FR' + value;
    }
    onUpdate({ tvaNumber: value });
    if (errors.tvaNumber) {
      setErrors(prev => ({ ...prev, tvaNumber: '' }));
    }
  };

  // Format SIRET number as user types
  const handleSiretChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 14);
    onUpdate({ siretNumber: value });
    if (errors.siretNumber) {
      setErrors(prev => ({ ...prev, siretNumber: '' }));
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Box textAlign="center" mb={4}>
        <Business sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Business Information
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Complete your establishment details for legal compliance
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Basic Business Information */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Business sx={{ mr: 1 }} />
            Basic Information
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Business Name"
            value={formData.businessName}
            onChange={handleInputChange('businessName')}
            error={!!errors.businessName}
            helperText={errors.businessName || 'Official business name as registered'}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Business color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Contact Email"
            type="email"
            value={formData.contactEmail}
            onChange={handleInputChange('contactEmail')}
            error={!!errors.contactEmail}
            helperText={errors.contactEmail || 'Primary business contact email'}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Phone Number"
            value={formData.phone}
            onChange={handleInputChange('phone')}
            error={!!errors.phone}
            helperText={errors.phone || 'Business phone number'}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Business Address"
            multiline
            rows={2}
            value={formData.address}
            onChange={handleInputChange('address')}
            error={!!errors.address}
            helperText={errors.address || 'Complete business address including city and postal code'}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                  <LocationOn color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        {/* Legal Information */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Receipt sx={{ mr: 1 }} />
            Legal Information (Optional)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Required for French tax compliance if applicable
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="TVA Number"
            value={formData.tvaNumber}
            onChange={handleTvaChange}
            error={!!errors.tvaNumber}
            helperText={errors.tvaNumber || 'French VAT number (if applicable)'}
            placeholder="FR12345678901"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Receipt color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="French TVA number format: FR followed by 11 digits">
                    <IconButton edge="end" size="small">
                      <Info />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="SIRET Number"
            value={formData.siretNumber}
            onChange={handleSiretChange}
            error={!!errors.siretNumber}
            helperText={errors.siretNumber || 'French business registration number (if applicable)'}
            placeholder="12345678901234"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AccountBalance color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="SIRET number is exactly 14 digits">
                    <IconButton edge="end" size="small">
                      <Info />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 3, mb: 4 }}>
        <Typography variant="body2">
          <strong>Legal Compliance:</strong> This information will be used for business registration, 
          legal documentation, and compliance with French business regulations. TVA and SIRET numbers 
          are only required if your business is registered in France.
        </Typography>
      </Alert>

      <Box display="flex" justifyContent="space-between" mt={4}>
        <Button
          variant="outlined"
          onClick={onBack}
          size="large"
        >
          Back
        </Button>
        <Button
          variant="contained"
          type="submit"
          size="large"
          sx={{ minWidth: 150 }}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
};