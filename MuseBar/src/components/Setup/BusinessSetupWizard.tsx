/**
 * Business Setup Wizard - Main component for establishment owner setup
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Button
} from '@mui/material';
import { SetupService } from '../../services/setupService';
import { InvitationValidation, SetupFormData } from '../../types/setup';
import { InvitationValidationStep } from './InvitationValidationStep';
import { PersonalInfoStep } from './PersonalInfoStep';
import { BusinessInfoStep } from './BusinessInfoStep';
import { ConfirmationStep } from './ConfirmationStep';
import { CompletionStep } from './CompletionStep';

const SETUP_STEPS = [
  { id: 1, title: 'Validation', description: 'Verify invitation' },
  { id: 2, title: 'Personal Info', description: 'Your account details' },
  { id: 3, title: 'Business Info', description: 'Business details' },
  { id: 4, title: 'Confirmation', description: 'Review and confirm' },
  { id: 5, title: 'Complete', description: 'Setup finished' }
];

export const BusinessSetupWizard: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<InvitationValidation | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<SetupFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    contactEmail: '',
    phone: '',
    address: '',
    tvaNumber: '',
    siretNumber: ''
  });

  // Validate invitation on component mount
  useEffect(() => {
    const validateInvitation = async () => {
      if (!token) {
        setError('No invitation token provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Check if setup is already completed
        const statusCheck = await SetupService.checkSetupStatus(token);
        if (statusCheck.completed) {
          navigate(statusCheck.redirectUrl || '/login');
          return;
        }

        // Validate invitation
        const validation = await SetupService.validateInvitation(token);
        
        if (!validation.isValid) {
          setError(validation.error || 'Invalid invitation token');
          setLoading(false);
          return;
        }

        setInvitationData(validation);
        
        // Pre-fill form data from invitation
        if (validation.establishment) {
          setFormData(prev => ({
            ...prev,
            businessName: validation.establishment!.name,
            contactEmail: validation.establishment!.email,
            email: validation.establishment!.email
          }));
        }

        setCurrentStep(2); // Skip validation step if valid
        setLoading(false);
        
      } catch (err) {
        console.error('Invitation validation error:', err);
        setError('Failed to validate invitation. Please try again.');
        setLoading(false);
      }
    };

    validateInvitation();
  }, [token, navigate]);

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < SETUP_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Form data update handler
  const updateFormData = (updates: Partial<SetupFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Validating invitation...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" color="error" gutterBottom>
            Setup Error
          </Typography>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => navigate('/login')}
          >
            Return to Login
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header */}
        <Box textAlign="center" mb={4}>
          <Typography variant="h3" component="h1" gutterBottom>
            🏪 Business Setup
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Welcome to MOSEHXL Professional POS System
          </Typography>
          {invitationData?.establishment && (
            <Typography variant="body1" sx={{ mt: 1 }}>
              Setting up: <strong>{invitationData.establishment.name}</strong>
            </Typography>
          )}
        </Box>

        {/* Progress Stepper */}
        <Stepper activeStep={currentStep - 1} sx={{ mb: 4 }}>
          {SETUP_STEPS.map((step, index) => (
            <Step key={step.id}>
              <StepLabel>
                <Typography variant="body2">{step.title}</Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step Content */}
        <Box>
          {currentStep === 1 && (
            <InvitationValidationStep 
              invitationData={invitationData}
              onNext={handleNext}
            />
          )}
          
          {currentStep === 2 && (
            <PersonalInfoStep
              formData={formData}
              onUpdate={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 3 && (
            <BusinessInfoStep
              formData={formData}
              onUpdate={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 4 && (
            <ConfirmationStep
              formData={formData}
              invitationData={invitationData}
              invitationToken={token!}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 5 && (
            <CompletionStep />
          )}
        </Box>
      </Paper>
    </Container>
  );
};