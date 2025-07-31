/**
 * Password Reset Request Component
 * Handles the initial password reset request form
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Alert,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  InputAdornment,
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { LoadingButton } from '../common/LoadingStates';

interface PasswordResetRequestProps {
  onSuccess?: () => void;
  onBack?: () => void;
}

const PasswordResetRequest: React.FC<PasswordResetRequestProps> = ({ 
  onSuccess, 
  onBack 
}) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');

  const handleRequestReset = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user-management/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        onSuccess?.();
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/login');
    }
  };

  if (success) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 2 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Reset Email Sent
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              We've sent a password reset link to <strong>{email}</strong>
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>What happens next?</strong>
            </Typography>
            <List dense sx={{ mt: 1 }}>
              <ListItem sx={{ py: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText 
                  primary="Check your email for the reset link"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <ListItem sx={{ py: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText 
                  primary="Click the link to set a new password"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <ListItem sx={{ py: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText 
                  primary="The link expires in 1 hour for security"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            </List>
          </Alert>

          <Box sx={{ textAlign: 'center' }}>
            <LoadingButton
              variant="outlined"
              onClick={handleBack}
              startIcon={<ArrowBackIcon />}
            >
              Back to Login
            </LoadingButton>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 2 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Reset Your Password
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Enter your email address and we'll send you a link to reset your password
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                ),
              }}
              placeholder="Enter your email address"
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12}>
            <LoadingButton
              fullWidth
              variant="contained"
              size="large"
              onClick={handleRequestReset}
              loading={loading}
              startIcon={<SendIcon />}
            >
              Send Reset Link
            </LoadingButton>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center' }}>
              <LoadingButton
                variant="text"
                onClick={handleBack}
                startIcon={<ArrowBackIcon />}
                disabled={loading}
              >
                Back to Login
              </LoadingButton>
            </Box>
          </Grid>
        </Grid>

        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Need Help?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              If you don't receive the email within a few minutes, check your spam folder. 
              The reset link will expire in 1 hour for security reasons.
            </Typography>
          </CardContent>
        </Card>
      </Paper>
    </Box>
  );
};

export default PasswordResetRequest; 