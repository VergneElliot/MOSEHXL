/**
 * Confirmation Step - Review and confirm all setup information
 * Refactored to use modular hooks for form management and submission
 */

import React from 'react';
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
import { SetupFormData, InvitationValidation } from '../../types/setup';
import { useConfirmationForm, useSetupSubmission } from './ConfirmationStep/hooks';

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
  onBack,
}) => {
  // Initialize hooks
  const confirmationForm = useConfirmationForm();
  const setupSubmission = useSetupSubmission({
    onSuccess: onNext,
    onError: confirmationForm.setErrorMessage,
    onLoading: confirmationForm.setSubmittingState,
  });

  // Get setup summary for display
  const setupSummary = setupSubmission.getSetupSummary(formData, invitationData);

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    const validationError = confirmationForm.validateForm();
    if (validationError) {
      confirmationForm.setErrorMessage(validationError);
      return;
    }

    await setupSubmission.submitSetup(formData, invitationData, invitationToken);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
        Confirmation et Finalisation
      </Typography>

      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Vérifiez vos informations avant de finaliser la configuration
      </Typography>

      {confirmationForm.error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={confirmationForm.clearError}>
          {confirmationForm.error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Personal Information */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Person color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Informations Personnelles
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Nom complet
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {setupSummary.userInfo.name}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Email
              </Typography>
              <Typography variant="body1">
                {setupSummary.userInfo.email}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Business Information */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Business color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Informations de l'Établissement
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Nom de l'établissement
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {setupSummary.businessInfo.name}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Adresse
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {setupSummary.businessInfo.address}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Téléphone
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {setupSummary.businessInfo.phone}
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    SIRET
                  </Typography>
                  <Typography variant="body1">
                    {setupSummary.businessInfo.siret}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    TVA
                  </Typography>
                  <Typography variant="body1">
                    {setupSummary.businessInfo.tva}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Configuration */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Security color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Configuration Système
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Terminal de caisse
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {setupSummary.systemInfo.posDevice}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Imprimante
              </Typography>
              <Typography variant="body1">
                {setupSummary.systemInfo.printer}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Invitation Information */}
        {setupSummary.invitationInfo && (
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircle color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Invitation
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Établissement
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {setupSummary.invitationInfo.establishmentName}
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Invité par
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {setupSummary.invitationInfo.inviterName}
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Rôle
                </Typography>
                <Typography variant="body1">
                  {setupSummary.invitationInfo.role}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Terms and Conditions */}
      <Card elevation={1} sx={{ mb: 4, bgcolor: 'grey.50' }}>
        <CardContent>
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmationForm.termsAccepted}
                onChange={(e) => confirmationForm.updateTermsAccepted(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                J'accepte les{' '}
                <Typography component="span" variant="body2" color="primary" sx={{ cursor: 'pointer' }}>
                  conditions générales d'utilisation
                </Typography>
                {' '}et la{' '}
                <Typography component="span" variant="body2" color="primary" sx={{ cursor: 'pointer' }}>
                  politique de confidentialité
                </Typography>
              </Typography>
            }
          />
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          onClick={onBack}
          disabled={confirmationForm.isSubmitting}
          size="large"
        >
          Retour
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={confirmationForm.isSubmitting || !confirmationForm.isFormValid()}
          size="large"
          startIcon={
            confirmationForm.isSubmitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <CheckCircle />
            )
          }
        >
          {confirmationForm.isSubmitting ? 'Configuration...' : 'Finaliser la Configuration'}
        </Button>
      </Box>

      {/* Help Text */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1, border: 1, borderColor: 'info.200' }}>
        <Typography variant="body2" color="info.800" align="center">
          🎉 <strong>Dernière étape !</strong> Une fois validé, votre système sera prêt à l'emploi. 
          Vous pourrez modifier ces paramètres ultérieurement dans les réglages.
        </Typography>
      </Box>
    </Box>
  );
};