/**
 * Password Reset Form Component
 * Handles setting new password with reset token
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowBack as ArrowBackIcon,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { LoadingButton } from '../common/LoadingStates';

interface PasswordValidation {
  length: boolean;
  lowercase: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
}

interface PasswordResetFormProps {
  token: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ 
  token, 
  onSuccess, 
  onBack 
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form data
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password validation
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    special: false,
  });

  // Update password validation in real-time
  useEffect(() => {
    if (newPassword) {
      setPasswordValidation({
        length: newPassword.length >= 8,
        lowercase: /[a-z]/.test(newPassword),
        uppercase: /[A-Z]/.test(newPassword),
        number: /\d/.test(newPassword),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
      });
    }
  }, [newPassword]);

  const handleResetPassword = async () => {
    if (!newPassword) {
      setError('New password is required');
      return;
    }

    if (!confirmPassword) {
      setError('Please confirm your password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Check if password meets all requirements
    const isPasswordValid = Object.values(passwordValidation).every(Boolean);
    if (!isPasswordValid) {
      setError('Password does not meet all requirements');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user-management/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        onSuccess?.();
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (): number => {
    return Object.values(passwordValidation).filter(Boolean).length;
  };

  const getPasswordStrengthColor = (): 'error' | 'warning' | 'success' => {
    const strength = getPasswordStrength();
    if (strength <= 2) return 'error';
    if (strength <= 3) return 'warning';
    return 'success';
  };

  const getPasswordStrengthText = (): string => {
    const strength = getPasswordStrength();
    if (strength <= 2) return 'Weak';
    if (strength <= 3) return 'Fair';
    if (strength <= 4) return 'Good';
    return 'Strong';
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
              Password Reset Successfully
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your password has been updated. You can now log in with your new password.
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <LoadingButton
              variant="contained"
              onClick={() => navigate('/login')}
              startIcon={<LockIcon />}
            >
              Go to Login
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
            Set New Password
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create a strong password for your account
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
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SecurityIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              placeholder="Enter your new password"
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              placeholder="Confirm your new password"
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Password Requirements
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(getPasswordStrength() / 5) * 100}
                    color={getPasswordStrengthColor()}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Strength: {getPasswordStrengthText()}
                  </Typography>
                </Box>
                <List dense>
                  <ListItem sx={{ py: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {passwordValidation.length ? (
                        <CheckCircleIcon fontSize="small" color="success" />
                      ) : (
                        <SecurityIcon fontSize="small" color="disabled" />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary="At least 8 characters long"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {passwordValidation.lowercase ? (
                        <CheckCircleIcon fontSize="small" color="success" />
                      ) : (
                        <SecurityIcon fontSize="small" color="disabled" />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary="Contains lowercase letter"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {passwordValidation.uppercase ? (
                        <CheckCircleIcon fontSize="small" color="success" />
                      ) : (
                        <SecurityIcon fontSize="small" color="disabled" />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary="Contains uppercase letter"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {passwordValidation.number ? (
                        <CheckCircleIcon fontSize="small" color="success" />
                      ) : (
                        <SecurityIcon fontSize="small" color="disabled" />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary="Contains number"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {passwordValidation.special ? (
                        <CheckCircleIcon fontSize="small" color="success" />
                      ) : (
                        <SecurityIcon fontSize="small" color="disabled" />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary="Contains special character"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <LoadingButton
              fullWidth
              variant="contained"
              size="large"
              onClick={handleResetPassword}
              loading={loading}
              disabled={!Object.values(passwordValidation).every(Boolean) || newPassword !== confirmPassword}
            >
              Reset Password
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
      </Paper>
    </Box>
  );
};

export default PasswordResetForm; 