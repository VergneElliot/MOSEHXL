/**
 * Establishment Account Creation - Main Container Component
 * Orchestrates the complete establishment account creation flow
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Container, Paper, Typography, Alert, CircularProgress } from '@mui/material';
import { SetupState, SetupActions } from './types';
import { useEstablishmentSetup } from './hooks/useEstablishmentSetup';
import SetupStepper from './components/SetupStepper';
import AccountCreationStep from './steps/AccountCreationStep';
import BusinessInfoStep from './steps/BusinessInfoStep';
import CompletionStep from './steps/CompletionStep';

const EstablishmentAccountCreation: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // Initialize setup state
  const [setupState, setSetupState] = useState<SetupState>({
    currentStep: 1, // Start at step 1 (Account Creation) - renumbered
    steps: [
      { id: 1, title: 'Create Account', description: 'Set up your password', completed: false, active: true },
      { id: 2, title: 'Business Information', description: 'Enter your business details', completed: false, active: false },
      { id: 3, title: 'Complete Setup', description: 'Review and finalize', completed: false, active: false }
    ],
    invitationData: null,
    businessInfo: null,
    password: '',
    isLoading: false,
    error: null,
    isCompleted: false,
    successMessage: null
  });

  // Setup actions (memoized so useEffect dependency is stable)
  const setupActions: SetupActions = useMemo(() => ({
    setCurrentStep: (step: number) => {
      setSetupState(prev => ({ ...prev, currentStep: step }));
    },
    setInvitationData: (data) => {
      setSetupState(prev => ({ ...prev, invitationData: data }));
    },
    setBusinessInfo: (info) => {
      setSetupState(prev => ({ ...prev, businessInfo: info }));
    },
    setPassword: (password) => {
      setSetupState(prev => ({ ...prev, password }));
    },
    setLoading: (loading) => {
      setSetupState(prev => ({ ...prev, isLoading: loading }));
    },
    setError: (error) => {
      setSetupState(prev => ({ ...prev, error }));
    },
    completeStep: (stepId: number) => {
      setSetupState(prev => ({
        ...prev,
        steps: prev.steps.map(step => 
          step.id === stepId ? { ...step, completed: true } : step
        )
      }));
    },
    setCompleted: (completed: boolean) => {
      setSetupState(prev => ({ ...prev, isCompleted: completed }));
    },
    setSuccessMessage: (message: string | null) => {
      setSetupState(prev => ({ ...prev, successMessage: message }));
    },
    resetSetup: () => {
      setSetupState(prev => ({
        ...prev,
        currentStep: 1,
        steps: prev.steps.map(step => ({ ...step, completed: false, active: step.id === 1 })),
        invitationData: null,
        businessInfo: null,
        password: '',
        isLoading: false,
        error: null,
        isCompleted: false,
        successMessage: null
      }));
    }
  }), []);

  // Custom hook for setup logic
  const {
    createAccount
  } = useEstablishmentSetup();

  // Skip invitation validation - if user has the token, they're already invited
  useEffect(() => {
    if (token) {
      // Token exists, proceed directly to account creation (step 1 is already completed in initial state)
    } else {
      setupActions.setError('No invitation token provided');
    }
  }, [token, setupActions]);

  // Handle step completion
  const handleStepComplete = (stepId: number, data?: any) => {
    setupActions.completeStep(stepId);
    
    if (stepId === 1 && data?.password) {
      setupActions.setPassword(data.password);
      setupActions.setError(null); // Clear any previous errors
      setupActions.setCurrentStep(2);
    } else if (stepId === 2 && data?.businessInfo) {
      setupActions.setBusinessInfo(data.businessInfo);
      setupActions.setError(null); // Clear any previous errors
      setupActions.setCurrentStep(3);
    } else if (stepId === 3) {
      // Complete the setup
      handleCompleteSetup();
    }
  };

  // Handle final setup completion
  const handleCompleteSetup = async () => {
    console.log('🚀 Starting account creation...');
    console.log('Token:', token);
    console.log('Business Info:', setupState.businessInfo);
    console.log('Password:', setupState.password ? '***' : 'MISSING');
    
    if (!token || !setupState.businessInfo || !setupState.password) {
      console.error('❌ Missing required information');
      setupActions.setError('Missing required information');
      return;
    }

    setupActions.setLoading(true);
    setupActions.setError(null);

    try {
      console.log('📡 Calling createAccount API...');
      const result = await createAccount({
        token: token, // Use the token from URL params
        password: setupState.password,
        businessInfo: setupState.businessInfo
      });

      console.log('📡 API Response:', result);

      if (result.success) {
        console.log('✅ Account creation successful!');
        setupActions.completeStep(3);
        setupActions.setCompleted(true);
        setupActions.setSuccessMessage('🎉 Account created successfully! You will now be redirected to your POS system.');
        
        // Redirect to the POS system after a short delay
        setTimeout(() => {
          navigate('/dashboard', { 
            state: { 
              message: 'Account created successfully! Welcome to your POS system.',
              email: result.user?.email,
              establishment: result.establishment
            }
          });
        }, 2000);
      } else {
        console.error('❌ Account creation failed:', result.error || result.message);
        setupActions.setError(result.error || result.message || 'Failed to create account');
      }
    } catch (error: unknown) {
      console.error('❌ Unexpected error:', error);
      setupActions.setError('An unexpected error occurred');
    } finally {
      setupActions.setLoading(false);
    }
  };

  // Render current step
  const renderCurrentStep = () => {
    switch (setupState.currentStep) {
      case 1:
        return (
          <AccountCreationStep
            onComplete={(data) => handleStepComplete(1, data)}
            onError={setupActions.setError}
          />
        );
      case 2:
        return (
          <BusinessInfoStep
            onComplete={(data) => handleStepComplete(2, data)}
            onError={setupActions.setError}
          />
        );
      case 3:
        return (
          <CompletionStep
            businessInfo={setupState.businessInfo}
            onComplete={() => handleStepComplete(3)}
            onError={setupActions.setError}
            isLoading={setupState.isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Establish Your Business Account
        </Typography>
        
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Complete your establishment setup to access your POS system
        </Typography>

        {/* Setup Stepper */}
        <SetupStepper 
          steps={setupState.steps}
          currentStep={setupState.currentStep}
          onStepClick={setupActions.setCurrentStep}
        />

        {/* Error Display */}
        {setupState.error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {setupState.error}
          </Alert>
        )}

        {/* Loading Indicator */}
        {setupState.isLoading && (
          <Box display="flex" justifyContent="center" sx={{ mb: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Success Message */}
        {setupState.isCompleted && setupState.successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {setupState.successMessage}
          </Alert>
        )}

        {/* Current Step Content */}
        <Box sx={{ mt: 4 }}>
          {renderCurrentStep()}
        </Box>
      </Paper>
    </Container>
  );
};

export default EstablishmentAccountCreation;
