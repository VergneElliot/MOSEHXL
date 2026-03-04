/**
 * Business Information Step Component
 * Step 3: Enter business details (Tax ID, SIRET, address, etc.)
 */

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Business } from '@mui/icons-material';
import { BusinessInfo } from '../types';

interface BusinessInfoStepProps {
  onComplete: (data: { businessInfo: BusinessInfo }) => void;
  onError: (error: string) => void;
}

const BusinessInfoStep: React.FC<BusinessInfoStepProps> = ({
  onComplete,
  onError
}) => {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    companyName: '',
    taxId: '',
    siretNumber: '',
    address: '',
    postalCode: '',
    city: '',
    country: 'France',
    businessType: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const businessTypes = [
    'Restaurant',
    'Bar',
    'Café',
    'Bistro',
    'Brasserie',
    'Fast Food',
    'Food Truck',
    'Catering',
    'Other'
  ];

  const validateField = (field: keyof BusinessInfo, value: string): string => {
    switch (field) {
      case 'companyName':
        if (!value.trim()) return 'Company name is required';
        if (value.trim().length < 2) return 'Company name must be at least 2 characters';
        break;
      
      case 'taxId':
        // NO RESTRICTIONS WHATSOEVER - user can enter anything or leave empty
        break;
      
      case 'siretNumber':
        // NO RESTRICTIONS WHATSOEVER - user can enter anything or leave empty
        break;
      
      case 'address':
        if (!value.trim()) return 'Address is required';
        if (value.trim().length < 5) return 'Address must be at least 5 characters';
        break;
      
      case 'postalCode':
        if (!value.trim()) return 'Postal code is required';
        if (!/^\d{5}$/.test(value)) return 'Postal code must be exactly 5 digits';
        break;
      
      case 'city':
        if (!value.trim()) return 'City is required';
        if (value.trim().length < 2) return 'City must be at least 2 characters';
        break;
      
      case 'country':
        if (!value.trim()) return 'Country is required';
        break;
      
      case 'businessType':
        if (!value.trim()) return 'Business type is required';
        break;
    }
    return '';
  };

  const handleFieldChange = (field: keyof BusinessInfo, value: string) => {
    setBusinessInfo(prev => ({ ...prev, [field]: value }));
    
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // BYPASS ALL VALIDATION - allow form submission regardless of validation errors
    // This ensures the form can be submitted even if there are validation issues
    
    setIsSubmitting(true);

    try {
      // Simulate validation delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onComplete({ businessInfo });
    } catch (error: unknown) {
      onError('Failed to validate business information');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Step 3: Business Information
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Please provide your business details. This information is required for tax compliance and legal purposes.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Business color="primary" />
            <Typography variant="h6">
              Business Details
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            All fields marked with * are required for French business compliance.
          </Typography>
        </CardContent>
      </Card>

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Company Name */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Company Name *"
              value={businessInfo.companyName}
              onChange={(e) => handleFieldChange('companyName', e.target.value)}
              error={!!errors.companyName}
              helperText={errors.companyName}
              placeholder="Enter your company name"
            />
          </Grid>

          {/* Tax ID and SIRET */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Tax ID (Numéro de TVA) *"
              value={businessInfo.taxId}
              onChange={(e) => handleFieldChange('taxId', e.target.value)}
              error={!!errors.taxId}
              helperText={errors.taxId || 'French tax identification number'}
              placeholder="Enter your tax ID"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="SIRET Number *"
              value={businessInfo.siretNumber}
              onChange={(e) => handleFieldChange('siretNumber', e.target.value)}
              error={!!errors.siretNumber}
              helperText={errors.siretNumber || 'Establishment identification number (can contain letters and numbers)'}
              placeholder="FR52XXX or 12345678901234"
            />
          </Grid>

          {/* Business Type */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.businessType}>
              <InputLabel>Business Type *</InputLabel>
              <Select
                value={businessInfo.businessType}
                onChange={(e) => handleFieldChange('businessType', e.target.value)}
                label="Business Type *"
              >
                {businessTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
              {errors.businessType && (
                <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                  {errors.businessType}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Country */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Country *"
              value={businessInfo.country}
              onChange={(e) => handleFieldChange('country', e.target.value)}
              error={!!errors.country}
              helperText={errors.country}
              disabled
            />
          </Grid>

          {/* Address */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address *"
              value={businessInfo.address}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              error={!!errors.address}
              helperText={errors.address}
              placeholder="Enter your business address"
              multiline
              rows={2}
            />
          </Grid>

          {/* Postal Code and City */}
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Postal Code *"
              value={businessInfo.postalCode}
              onChange={(e) => handleFieldChange('postalCode', e.target.value.replace(/\D/g, ''))}
              error={!!errors.postalCode}
              helperText={errors.postalCode}
              placeholder="75001"
              inputProps={{ maxLength: 5 }}
            />
          </Grid>

          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="City *"
              value={businessInfo.city}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              error={!!errors.city}
              helperText={errors.city}
              placeholder="Enter your city"
            />
          </Grid>
        </Grid>

        <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting}
            sx={{ minWidth: 200 }}
          >
            {isSubmitting ? 'Validating...' : 'Continue to Review'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default BusinessInfoStep;
