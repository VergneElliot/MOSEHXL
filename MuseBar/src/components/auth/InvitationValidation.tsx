/**
 * Invitation Validation Component
 * Handles invitation token validation and initial setup
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Email as EmailIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
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
  token: string;
  onValidated: (invitation: InvitationData) => void;
  onError: (error: string) => void;
}

const InvitationValidation: React.FC<InvitationValidationProps> = ({
  token,
  onValidated,
  onError,
}) => {
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    validateInvitation();
  }, [token]);

  const validateInvitation = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user-management/validate-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setInvitation(data.invitation);
        onValidated(data.invitation);
      } else {
        const errorMessage = data.error || 'Invalid or expired invitation';
        setError(errorMessage);
        onError(errorMessage);
      }
    } catch (err) {
      const errorMessage = 'Network error. Please try again.';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 2 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <CircularProgress size={64} sx={{ mb: 2 }} />
            <Typography variant="h5" component="h1" gutterBottom>
              Validating Invitation
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Please wait while we verify your invitation...
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 2 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom color="error">
              Invalid Invitation
            </Typography>
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
            <Typography variant="body1" color="text.secondary">
              This invitation link is invalid or has expired. Please contact your administrator for a new invitation.
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 2 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome to {invitation.establishmentName}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            You've been invited to join the team. Let's set up your account.
          </Typography>
        </Box>

        <Card variant="outlined" sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Invitation Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <EmailIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="body2">
                    <strong>Email:</strong> {invitation.email}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="body2">
                    <strong>Establishment:</strong> {invitation.establishmentName}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AssignmentIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="body2">
                    <strong>Role:</strong> {invitation.role}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="body2">
                    <strong>Invited by:</strong> {invitation.inviterName}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2 }}>
              <Chip
                label={`Expires: ${new Date(invitation.expiresAt).toLocaleDateString()}`}
                color="primary"
                variant="outlined"
                size="small"
              />
            </Box>
          </CardContent>
        </Card>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Next Steps:</strong>
          </Typography>
          <List dense sx={{ mt: 1 }}>
            <ListItem sx={{ py: 0 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CheckCircleIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Complete your personal information"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem sx={{ py: 0 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CheckCircleIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Create a strong password"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem sx={{ py: 0 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CheckCircleIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Start using your account"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          </List>
        </Alert>
      </Paper>
    </Box>
  );
};

export default InvitationValidation; 