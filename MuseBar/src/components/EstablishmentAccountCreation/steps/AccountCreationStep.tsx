/**
 * Account Creation Step Component
 * Step 2: Set up password for the establishment account
 */

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card,
  CardContent,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  OutlinedInput
} from '@mui/material';
import { Visibility, VisibilityOff, Lock, Security } from '@mui/icons-material';
type PasswordStrengthColor = 'error' | 'warning' | 'info' | 'success';

interface AccountCreationStepProps {
  onComplete: (data: { password: string }) => void;
  onError: (error: string) => void;
}

const AccountCreationStep: React.FC<AccountCreationStepProps> = ({
  onComplete,
  onError
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const passwordErrors = validatePassword(value);
    setErrors(prev => ({
      ...prev,
      password: passwordErrors[0] ?? ''
    }));
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (value !== password) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: 'Passwords do not match'
      }));
    } else {
      setErrors(prev => ({
        ...prev,
        confirmPassword: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setErrors({});

    // Validate passwords
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setErrors({ password: passwordErrors[0] ?? 'Password validation failed' });
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      setIsSubmitting(false);
      return;
    }

    try {
      // Simulate validation delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onComplete({ password });
    } catch (error: unknown) {
      onError('Failed to validate password');
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Step 2: Create Your Account Password
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Set up a secure password for your establishment account. This will be used to access your POS system.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Lock color="primary" />
            <Typography variant="h6">
              Password Requirements
            </Typography>
          </Box>
          
          <Box component="ul" sx={{ pl: 2, mb: 3 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              At least 8 characters long
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Contains uppercase and lowercase letters
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Contains at least one number
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Contains at least one special character
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Box component="form" onSubmit={handleSubmit}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel htmlFor="password">Password</InputLabel>
          <OutlinedInput
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            error={!!errors.password}
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
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
          {password && (
            <Box display="flex" alignItems="center" gap={1} mt={1}>
              <Security fontSize="small" color={passwordStrength.color} />
              <Typography variant="caption" color={`${passwordStrength.color}.main`}>
                Password strength: {passwordStrength.label}
              </Typography>
            </Box>
          )}
        </FormControl>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel htmlFor="confirmPassword">Confirm Password</InputLabel>
          <OutlinedInput
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => handleConfirmPasswordChange(e.target.value)}
            error={!!errors.confirmPassword}
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle confirm password visibility"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  edge="end"
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

        <Box display="flex" justifyContent="center">
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting || !password || !confirmPassword || !!errors.password || !!errors.confirmPassword}
            sx={{ minWidth: 200 }}
          >
            {isSubmitting ? 'Validating...' : 'Continue to Business Information'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default AccountCreationStep;
