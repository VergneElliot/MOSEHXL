/**
 * Password Reset Form Component
 * Handles setting new password with reset token
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
  LinearProgress,
  Chip,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

interface PasswordValidation {
  length: boolean;
  lowercase: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
}

interface PasswordResetFormProps {
  token: string;
  onSubmit: (password: string) => Promise<void>;
  loading: boolean;
  error: string;
  success: boolean;
}

export const PasswordResetForm: React.FC<PasswordResetFormProps> = ({
  token,
  onSubmit,
  loading,
  error,
  success,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        // Any non-alphanumeric character counts as special
        special: /[^A-Za-z0-9]/.test(newPassword),
      });
    }
  }, [newPassword]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validateForm()) {
      await onSubmit(newPassword);
    }
  };

  const validateForm = (): boolean => {
    return (
      newPassword.length >= 8 &&
      newPassword === confirmPassword &&
      Object.values(passwordValidation).every(Boolean)
    );
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
    return 'Strong';
  };

  if (success) {
    return (
      <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4, p: 2 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Password Reset Successfully!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Your password has been updated. You can now log in with your new password.
          </Typography>
          <Button variant="contained" href="/login">
            Go to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4, p: 2 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <SecurityIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Set New Password
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create a strong password for your account.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                InputProps={{
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
              />
              
              {/* Password strength indicator */}
              {newPassword && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(getPasswordStrength() / 5) * 100}
                    color={getPasswordStrengthColor()}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption" color={getPasswordStrengthColor()}>
                      {getPasswordStrengthText()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getPasswordStrength()}/5 criteria met
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Password validation checklist */}
              {newPassword && (
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={1}>
                    {[
                      { key: 'length', label: 'At least 8 characters' },
                      { key: 'lowercase', label: 'Lowercase letter' },
                      { key: 'uppercase', label: 'Uppercase letter' },
                      { key: 'number', label: 'Number' },
                      { key: 'special', label: 'Special character' },
                    ].map(({ key, label }) => (
                      <Grid item xs={12} sm={6} key={key}>
                        <Chip
                          label={label}
                          size="small"
                          color={passwordValidation[key as keyof PasswordValidation] ? 'success' : 'default'}
                          variant={passwordValidation[key as keyof PasswordValidation] ? 'filled' : 'outlined'}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                error={confirmPassword !== '' && newPassword !== confirmPassword}
                helperText={
                  confirmPassword !== '' && newPassword !== confirmPassword
                    ? 'Passwords do not match'
                    : ''
                }
                InputProps={{
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
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={!validateForm() || loading}
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}; 