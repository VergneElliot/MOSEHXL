import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Button,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

interface InvitationSuccessProps {
  invitation: any;
  onContinue: () => void;
}

export const InvitationSuccess: React.FC<InvitationSuccessProps> = ({
  invitation,
  onContinue,
}) => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Welcome to {invitation.establishmentName}!
      </Typography>
      
      <Stepper activeStep={2} sx={{ mb: 3 }}>
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

      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Account Created Successfully!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Your account has been set up and you're now ready to use the system.
        </Typography>
      </Box>

      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Next Steps:</strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          • You can now log in with your email and password
        </Typography>
        <Typography variant="body2">
          • Your account is linked to {invitation.establishmentName}
        </Typography>
        <Typography variant="body2">
          • You have {invitation.role} permissions
        </Typography>
      </Alert>

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={onContinue}
          startIcon={<CheckCircleIcon />}
        >
          Continue to Login
        </Button>
      </Box>
    </Paper>
  );
}; 