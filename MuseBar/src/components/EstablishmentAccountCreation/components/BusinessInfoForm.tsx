/**
 * Business Information Form Component
 * Reusable form component for business information input
 */

import React from 'react';
import { 
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import { BusinessInfo } from '../types';

interface BusinessInfoFormProps {
  businessInfo: BusinessInfo;
  errors: { [key: string]: string };
  onChange: (field: keyof BusinessInfo, value: string) => void;
  disabled?: boolean;
}

const BusinessInfoForm: React.FC<BusinessInfoFormProps> = ({
  businessInfo,
  errors,
  onChange,
  disabled = false
}) => {
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

  const handleFieldChange = (field: keyof BusinessInfo, value: string) => {
    // Apply field-specific formatting
    let formattedValue = value;
    
    switch (field) {
      case 'taxId':
      case 'siretNumber':
      case 'postalCode':
        // Remove non-digits
        formattedValue = value.replace(/\D/g, '');
        break;
      case 'companyName':
      case 'city':
        // Capitalize first letter of each word
        formattedValue = value.replace(/\b\w/g, l => l.toUpperCase());
        break;
      default:
        formattedValue = value;
    }
    
    onChange(field, formattedValue);
  };

  return (
    <Grid container spacing={3}>
      {/* Company Name */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Company Name"
          value={businessInfo.companyName}
          onChange={(e) => handleFieldChange('companyName', e.target.value)}
          error={!!errors.companyName}
          helperText={errors.companyName}
          placeholder="Enter your company name"
          disabled={disabled}
          required
        />
      </Grid>

      {/* Tax ID and SIRET */}
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Tax ID (SIREN)"
          value={businessInfo.taxId}
          onChange={(e) => handleFieldChange('taxId', e.target.value)}
          error={!!errors.taxId}
          helperText={errors.taxId || 'French tax identification number (any format)'}
          placeholder="Enter your tax ID"
          inputProps={{}}
          disabled={disabled}
          required
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="SIRET Number"
          value={businessInfo.siretNumber}
          onChange={(e) => handleFieldChange('siretNumber', e.target.value)}
          error={!!errors.siretNumber}
          helperText={errors.siretNumber || 'Establishment identification number (any format)'}
          placeholder="Enter your SIRET number"
          inputProps={{}}
          disabled={disabled}
          required
        />
      </Grid>

      {/* Business Type */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth error={!!errors.businessType} disabled={disabled}>
          <InputLabel>Business Type</InputLabel>
          <Select
            value={businessInfo.businessType}
            onChange={(e) => handleFieldChange('businessType', e.target.value)}
            label="Business Type"
            required
          >
            {businessTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
          {errors.businessType && (
            <FormHelperText>{errors.businessType}</FormHelperText>
          )}
        </FormControl>
      </Grid>

      {/* Country */}
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Country"
          value={businessInfo.country}
          onChange={(e) => handleFieldChange('country', e.target.value)}
          error={!!errors.country}
          helperText={errors.country}
          disabled={disabled}
          required
        />
      </Grid>

      {/* Address */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Address"
          value={businessInfo.address}
          onChange={(e) => handleFieldChange('address', e.target.value)}
          error={!!errors.address}
          helperText={errors.address}
          placeholder="Enter your business address"
          multiline
          rows={2}
          disabled={disabled}
          required
        />
      </Grid>

      {/* Postal Code and City */}
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="Postal Code"
          value={businessInfo.postalCode}
          onChange={(e) => handleFieldChange('postalCode', e.target.value)}
          error={!!errors.postalCode}
          helperText={errors.postalCode}
          placeholder="75001"
          inputProps={{ maxLength: 5 }}
          disabled={disabled}
          required
        />
      </Grid>

      <Grid item xs={12} sm={8}>
        <TextField
          fullWidth
          label="City"
          value={businessInfo.city}
          onChange={(e) => handleFieldChange('city', e.target.value)}
          error={!!errors.city}
          helperText={errors.city}
          placeholder="Enter your city"
          disabled={disabled}
          required
        />
      </Grid>
    </Grid>
  );
};

export default BusinessInfoForm;
