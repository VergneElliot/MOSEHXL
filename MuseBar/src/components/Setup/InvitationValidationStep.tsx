/**
 * Invitation Validation Step - Displays invitation details and confirmation
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert
} from '@mui/material';
import { CheckCircle, Business, Schedule } from '@mui/icons-material';
import { InvitationValidation } from '../../types/setup';

interface InvitationValidationStepProps {
  invitationData: InvitationValidation | null;
  onNext: () => void;
}

export const InvitationValidationStep: React.FC<InvitationValidationStepProps> = ({
  invitationData,
  onNext
}) => {
  if (!invitationData?.isValid) {
    return (
      <Box textAlign="center">
        <Alert severity="error" sx={{ mb: 3 }}>
          Invalid or expired invitation token
        </Alert>
      </Box>
    );
  }

  const formatExpirationDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box>
      <Box textAlign="center" mb={4}>
        <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Invitation Validated!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your invitation to set up the business POS system has been confirmed.
        </Typography>
      </Box>

      <Card elevation={2} sx={{ mb: 4 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Business sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Business Information
            </Typography>
          </Box>
          
          {invitationData.establishment && (
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                Business Name
              </Typography>
              <Typography variant="h6" gutterBottom>
                {invitationData.establishment.name}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                Contact Email
              </Typography>
              <Typography variant="body1">
                {invitationData.establishment.email}
              </Typography>
            </Box>
          )}

          {invitationData.expires_at && (
            <Box display="flex" alignItems="center" mt={2}>
              <Schedule sx={{ mr: 1, color: 'warning.main' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Invitation expires
                </Typography>
                <Typography variant="body1">
                  {formatExpirationDate(invitationData.expires_at)}
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          <strong>Next Steps:</strong> You'll be guided through setting up your personal account 
          and completing your business information. This process will create your dedicated POS 
          management system with all the tools you need to run your establishment.
        </Typography>
      </Alert>

      <Box textAlign="center">
        <Button 
          variant="contained" 
          size="large" 
          onClick={onNext}
          sx={{ minWidth: 200 }}
        >
          Continue Setup
        </Button>
      </Box>
    </Box>
  );
};