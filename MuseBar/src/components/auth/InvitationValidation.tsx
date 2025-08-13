/**
 * Invitation Validation Component
 * Handles invitation token validation and initial setup
 */

import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';

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

interface InvitationValidationProps {
  onValidationComplete: (invitation: InvitationData) => void;
  onError: (error: string) => void;
}

export const InvitationValidation: React.FC<InvitationValidationProps> = ({
  onValidationComplete,
  onError,
}) => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [validating, setValidating] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string>('');

  const validateInvitation = async () => {
    if (!token) {
      setError('Invalid invitation link');
      setValidating(false);
      return;
    }

    try {
      const { data } = await apiService.get<InvitationData>(`/invitations/validate?token=${token}`);
      setInvitation(data);
      onValidationComplete(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate invitation';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => {
    validateInvitation();
  }, [token]);

  if (validating) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!invitation) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        No invitation data found
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        Invitation Details
      </Typography>
      
      <Stepper activeStep={0} sx={{ mb: 3 }}>
        <Step>
          <StepLabel>Validate Invitation</StepLabel>
        </Step>
        <Step>
          <StepLabel>Account Setup</StepLabel>
        </Step>
        <Step>
          <StepLabel>Complete</StepLabel>
        </Step>
      </Stepper>

      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <EmailIcon sx={{ mr: 1 }} />
            <Typography variant="body1">
              <strong>Email:</strong> {invitation.email}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <BusinessIcon sx={{ mr: 1 }} />
            <Typography variant="body1">
              <strong>Establishment:</strong> {invitation.establishmentName}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SecurityIcon sx={{ mr: 1 }} />
            <Typography variant="body1">
              <strong>Role:</strong> {invitation.role}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PersonIcon sx={{ mr: 1 }} />
            <Typography variant="body1">
              <strong>Invited by:</strong> {invitation.inviterName}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
            <Chip label="Invitation Valid" color="success" size="small" />
          </Box>
        </CardContent>
      </Card>
    </Paper>
  );
}; 