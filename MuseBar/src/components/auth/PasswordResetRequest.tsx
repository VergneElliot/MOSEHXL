/**
 * Password Reset Request Component
 * Handles the initial password reset request form
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  Lock as LockIcon,
} from '@mui/icons-material';

interface PasswordResetRequestProps {
  onSubmit: (email: string) => Promise<void>;
  loading: boolean;
  error: string;
  success: boolean;
}

export const PasswordResetRequest: React.FC<PasswordResetRequestProps> = ({
  onSubmit,
  loading,
  error,
  success,
}) => {
  const [email, setEmail] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (email.trim()) {
      await onSubmit(email);
    }
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4, p: 2 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <LockIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Reset Your Password
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Enter your email address and we'll send you a link to reset your password.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Password reset link has been sent to your email address.
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <EmailIcon sx={{ mr: 1, color: 'action.active' }} />
                  ),
                }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={!email.trim() || loading}
              startIcon={<SendIcon />}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </Box>
        </form>

        <Card sx={{ mt: 4, bgcolor: 'info.50' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              What happens next?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • You'll receive an email with a secure reset link
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Click the link to set a new password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • The link expires in 1 hour for security
            </Typography>
          </CardContent>
        </Card>
      </Paper>
    </Box>
  );
}; 