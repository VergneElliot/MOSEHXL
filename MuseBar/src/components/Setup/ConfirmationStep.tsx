/**
 * Confirmation Step - Review and confirm all setup information
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { CheckCircle, Person, Business, Security } from '@mui/icons-material';
import { SetupFormData, InvitationValidation, BusinessSetupRequest } from '../../types/setup';
import { SetupService } from '../../services/setupService';

interface ConfirmationStepProps {
  formData: SetupFormData;
  invitationData: InvitationValidation | null;
  invitationToken: string;
  onNext: () => void;
  onBack: () => void;
}

export const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  formData,
  invitationData,
  invitationToken,
  onNext,
  onBack
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSubmit = async () => {
    if (!termsAccepted) {
      setError('Please accept the terms and conditions to continue');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const setupRequest: BusinessSetupRequest = {
        // User account information
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirmPassword,

        // Business information
        business_name: formData.businessName,
        contact_email: formData.contactEmail,
        phone: formData.phone,
        address: formData.address,
        tva_number: formData.tvaNumber || undefined,
        siret_number: formData.siretNumber || undefined,

        // Setup metadata
        invitation_token: invitationToken
      };

      const response = await SetupService.completeSetup(setupRequest);

      if (response.success) {
        // Store authentication token if provided
        if (response.token) {
          localStorage.setItem('auth_token', response.token);
        }
        onNext(); // Go to completion step
      } else {
        setError(response.message || 'Setup failed. Please try again.');
      }

    } catch (err: any) {
      console.error('Setup submission error:', err);
      setError(err.response?.data?.error || 'Failed to complete setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <Box textAlign="center" mb={4}>
        <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Review & Confirm
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please review your information before completing the setup
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Personal Information */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Person sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Personal Information</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary">Name</Typography>
              <Typography variant="body1" gutterBottom>
                {formData.firstName} {formData.lastName}
              </Typography>

              <Typography variant="body2" color="text.secondary">Email</Typography>
              <Typography variant="body1" gutterBottom>
                {formData.email}
              </Typography>

              <Typography variant="body2" color="text.secondary">Role</Typography>
              <Typography variant="body1">
                Business Administrator
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Business Information */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Business sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Business Information</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary">Business Name</Typography>
              <Typography variant="body1" gutterBottom>
                {formData.businessName}
              </Typography>

              <Typography variant="body2" color="text.secondary">Contact Email</Typography>
              <Typography variant="body1" gutterBottom>
                {formData.contactEmail}
              </Typography>

              <Typography variant="body2" color="text.secondary">Phone</Typography>
              <Typography variant="body1" gutterBottom>
                {formData.phone}
              </Typography>

              <Typography variant="body2" color="text.secondary">Address</Typography>
              <Typography variant="body1" gutterBottom>
                {formData.address}
              </Typography>

              {formData.tvaNumber && (
                <>
                  <Typography variant="body2" color="text.secondary">TVA Number</Typography>
                  <Typography variant="body1" gutterBottom>
                    {formData.tvaNumber}
                  </Typography>
                </>
              )}

              {formData.siretNumber && (
                <>
                  <Typography variant="body2" color="text.secondary">SIRET Number</Typography>
                  <Typography variant="body1">
                    {formData.siretNumber}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Setup Summary */}
        <Grid item xs={12}>
          <Card elevation={2} sx={{ bgcolor: 'primary.50' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Security sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">What happens next?</Typography>
              </Box>
              
              <Typography variant="body2" paragraph>
                Upon confirmation, the system will:
              </Typography>
              
              <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Create your administrator account with full system access
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Set up your dedicated business database and schema
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Initialize your POS system with all management tools
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Configure legal compliance settings for your region
                </Typography>
                <Typography component="li" variant="body2">
                  Provide immediate access to your business management dashboard
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 3 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="body2">
              I accept the terms and conditions and privacy policy for using the MOSEHXL POS system. 
              I confirm that all information provided is accurate and complete.
            </Typography>
          }
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Button
          variant="outlined"
          onClick={onBack}
          size="large"
          disabled={isSubmitting}
        >
          Back
        </Button>
        
        <Button
          variant="contained"
          onClick={handleSubmit}
          size="large"
          disabled={isSubmitting || !termsAccepted}
          sx={{ minWidth: 200 }}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
        >
          {isSubmitting ? 'Setting up...' : 'Complete Setup'}
        </Button>
      </Box>
    </Box>
  );
};