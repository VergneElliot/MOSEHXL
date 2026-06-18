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
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

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
  const { t } = useTranslation(['auth']);
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
    if (strength <= 2) return t('passwordResetForm.weak');
    if (strength <= 3) return t('passwordResetForm.fair');
    return t('passwordResetForm.strong');
  };

  if (success) {
    return (
      <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4, p: 2 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            {t('passwordResetForm.successTitle')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {t('passwordResetForm.successSubtitle')}
          </Typography>
          <Button variant="contained" href="/login">
            {t('passwordResetForm.goToLogin')}
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4, p: 2 }}>
      <Paper sx={{ p: 4 }}>
        <Box display="flex" justifyContent="flex-end" mb={1}>
          <LanguageSwitcher />
        </Box>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <SecurityIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            {t('passwordResetForm.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('passwordResetForm.subtitle')}
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
                label={t('passwordResetForm.newPassword')}
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
                      {t('passwordResetForm.criteriaMet', { count: getPasswordStrength() })}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Password validation checklist */}
              {newPassword && (
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={1}>
                    {[
                      { key: 'length', label: t('passwordResetForm.criteria.length') },
                      { key: 'lowercase', label: t('passwordResetForm.criteria.lowercase') },
                      { key: 'uppercase', label: t('passwordResetForm.criteria.uppercase') },
                      { key: 'number', label: t('passwordResetForm.criteria.number') },
                      { key: 'special', label: t('passwordResetForm.criteria.special') },
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
                label={t('passwordResetForm.confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                error={confirmPassword !== '' && newPassword !== confirmPassword}
                helperText={
                  confirmPassword !== '' && newPassword !== confirmPassword
                    ? t('passwordResetForm.passwordsDoNotMatch')
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
              {loading ? t('passwordResetForm.updating') : t('passwordResetForm.updatePassword')}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}; 