/**
 * Invitation Validation Step Component
 * Step 1: Validate the invitation token
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Alert, 
  CircularProgress, 
  Button,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import { CheckCircle, Error, AccessTime } from '@mui/icons-material';
import { establishmentAccountApi } from '../../../services/establishmentAccountApi';

interface InvitationValidationStepProps {
  token: string;
  onComplete: (data: any) => void;
  onError: (error: string) => void;
}

const InvitationValidationStep: React.FC<InvitationValidationStepProps> = ({
  token,
  onComplete,
  onError
}) => {
  const [isValidating, setIsValidating] = useState(true);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const validateInvitation = React.useCallback(async () => {
    try {
      setIsValidating(true);
      setError(null);

      const result = await establishmentAccountApi.validateInvitation(token);
      setValidationResult(result);

      if (result.isValid) {
        onComplete(result);
      } else {
        setError(result.error || 'Invalid invitation');
        onError(result.error || 'Invalid invitation');
      }
    } catch (err: unknown) {
      const errorMessage = (err as Error)?.message || 'Failed to validate invitation';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  }, [token, onComplete, onError]);

  useEffect(() => {
    validateInvitation();
  }, [validateInvitation]);

  const getStatusIcon = () => {
    if (isValidating) return <CircularProgress size={24} />;
    if (error) return <Error color="error" />;
    if (validationResult?.isValid) return <CheckCircle color="success" />;
    return <AccessTime color="warning" />;
  };

  const getStatusColor = () => {
    if (isValidating) return 'info';
    if (error) return 'error';
    if (validationResult?.isValid) return 'success';
    return 'warning';
  };

  const getStatusText = () => {
    if (isValidating) return 'Validating invitation...';
    if (error) return 'Validation failed';
    if (validationResult?.isValid) return 'Invitation valid';
    return 'Pending validation';
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Step 1: Validate Your Invitation
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        We're verifying your invitation to set up your establishment account.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            {getStatusIcon()}
            <Typography variant="h6">
              {getStatusText()}
            </Typography>
            <Chip 
              label={getStatusText()} 
              color={getStatusColor() as any}
              size="small"
            />
          </Box>

          {validationResult?.invitation && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Establishment ID:</strong> {validationResult.invitation.establishmentId}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Email:</strong> {validationResult.invitation.email}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Expires:</strong> {new Date(validationResult.invitation.expiresAt).toLocaleString()}
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {validationResult?.isValid && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Your invitation is valid! You can proceed to the next step.
            </Alert>
          )}
        </CardContent>
      </Card>

      {error && (
        <Box display="flex" justifyContent="center">
          <Button 
            variant="outlined" 
            onClick={validateInvitation}
            disabled={isValidating}
          >
            Retry Validation
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default InvitationValidationStep;
