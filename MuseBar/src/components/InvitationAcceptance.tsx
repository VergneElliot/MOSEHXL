/**
 * Invitation Acceptance Component
 * Handles the user invitation acceptance flow with account setup
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Alert } from '@mui/material';
import { InvitationValidation } from './auth/InvitationValidation';
import { AccountSetupForm } from './auth/AccountSetupForm';
import { InvitationSuccess } from './auth/InvitationSuccess';

interface InvitationData {
  email: string;
  establishmentName: string;
  role: string;
  inviterName: string;
  expiresAt: string;
  prefill: {
    firstName?: string;
    lastName?: string;
  };
}

interface AccountSetupData {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}

const InvitationAcceptance: React.FC = () => {
  const navigate = useNavigate();
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string>('');

  const handleValidationComplete = (invitationData: InvitationData) => {
    setInvitation(invitationData);
    setActiveStep(1);
  };

  const handleValidationError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleAccountSetup = async (accountData: AccountSetupData) => {
    setLoading(true);
    
    try {
      // Simulate API call - replace with actual API
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: new URLSearchParams(window.location.search).get('token'),
          ...accountData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create account');
      }

      setActiveStep(2);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const handleContinue = () => {
    navigate('/');
  };

  if (error) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 2 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 2 }}>
      {activeStep === 0 && (
        <InvitationValidation
          onValidationComplete={handleValidationComplete}
          onError={handleValidationError}
        />
      )}
      
      {activeStep === 1 && invitation && (
        <AccountSetupForm
          invitation={invitation}
          onSubmit={handleAccountSetup}
          onBack={handleBack}
          loading={loading}
        />
      )}
      
      {activeStep === 2 && invitation && (
        <InvitationSuccess
          invitation={invitation}
          onContinue={handleContinue}
        />
      )}
    </Box>
  );
};

export default InvitationAcceptance; 