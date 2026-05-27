/**
 * Account Creation Form Component
 * Reusable form component for password creation
 */

import React, { useState } from 'react';
import { 
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  IconButton,
  Typography,
  Box,
  LinearProgress
} from '@mui/material';
import { Visibility, VisibilityOff, Security } from '@mui/icons-material';

type PasswordStrengthColor = 'error' | 'warning' | 'info' | 'success';

interface AccountCreationFormProps {
  password: string;
  confirmPassword: string;
  errors: { [key: string]: string };
  onChange: (field: 'password' | 'confirmPassword', value: string) => void;
  disabled?: boolean;
  showStrengthIndicator?: boolean;
}

const AccountCreationForm: React.FC<AccountCreationFormProps> = ({
  password,
  confirmPassword,
  errors,
  onChange,
  disabled = false,
  showStrengthIndicator = true
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return errors;
  };

  const getPasswordStrength = (password: string): { score: number; label: string; color: PasswordStrengthColor } => {
    const errors = validatePassword(password);
    const score = Math.max(0, 5 - errors.length);
    
    if (score <= 1) return { score, label: 'Very Weak', color: 'error' };
    if (score <= 2) return { score, label: 'Weak', color: 'warning' };
    if (score <= 3) return { score, label: 'Fair', color: 'info' };
    if (score <= 4) return { score, label: 'Good', color: 'success' };
    return { score, label: 'Strong', color: 'success' };
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthPercentage = (passwordStrength.score / 5) * 100;

  const getStrengthColor = (color: PasswordStrengthColor) => {
    switch (color) {
      case 'error': return '#f44336';
      case 'warning': return '#ff9800';
      case 'info': return '#2196f3';
      case 'success': return '#4caf50';
      default: return '#e0e0e0';
    }
  };

  return (
    <Box>
      {/* Password Field */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel htmlFor="password">Password</InputLabel>
        <OutlinedInput
          id="password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => onChange('password', e.target.value)}
          error={!!errors.password}
          disabled={disabled}
          endAdornment={
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
                disabled={disabled}
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          }
          label="Password"
        />
        {errors.password && (
          <Typography variant="caption" color="error" sx={{ mt: 1 }}>
            {errors.password}
          </Typography>
        )}
        
        {/* Password Strength Indicator */}
        {showStrengthIndicator && password && (
          <Box sx={{ mt: 1 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Security fontSize="small" color={passwordStrength.color} />
              <Typography variant="caption" color={`${passwordStrength.color}.main`}>
                Password strength: {passwordStrength.label}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={strengthPercentage}
              sx={{
                height: 4,
                borderRadius: 2,
                backgroundColor: '#e0e0e0',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getStrengthColor(passwordStrength.color),
                },
              }}
            />
          </Box>
        )}
      </FormControl>

      {/* Confirm Password Field */}
      <FormControl fullWidth>
        <InputLabel htmlFor="confirmPassword">Confirm Password</InputLabel>
        <OutlinedInput
          id="confirmPassword"
          type={showConfirmPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => onChange('confirmPassword', e.target.value)}
          error={!!errors.confirmPassword}
          disabled={disabled}
          endAdornment={
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle confirm password visibility"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                edge="end"
                disabled={disabled}
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          }
          label="Confirm Password"
        />
        {errors.confirmPassword && (
          <Typography variant="caption" color="error" sx={{ mt: 1 }}>
            {errors.confirmPassword}
          </Typography>
        )}
      </FormControl>

      {/* Password Requirements */}
      {!password && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Password requirements:
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            <Typography component="li" variant="caption" color="text.secondary">
              At least 8 characters long
            </Typography>
            <Typography component="li" variant="caption" color="text.secondary">
              Contains uppercase and lowercase letters
            </Typography>
            <Typography component="li" variant="caption" color="text.secondary">
              Contains at least one number
            </Typography>
            <Typography component="li" variant="caption" color="text.secondary">
              Contains at least one special character
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AccountCreationForm;
