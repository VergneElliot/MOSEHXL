/**
 * Password Reset Component
 * Handles password reset requests and password reset with token
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
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
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowBack as ArrowBackIcon,
  Lock as LockIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { LoadingButton } from '../components/common/LoadingStates';

interface PasswordValidation {
  length: boolean;
  lowercase: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
}

const PasswordReset: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  // State management
  const [mode, setMode] = useState<'request' | 'reset'>('request');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form data
  const [email, setEmail] = useState('');
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

  useEffect(() => {
    if (token) {
      setMode('reset');
    }
  }, [token]);

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

  const handleRequestReset = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/user-management/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    // Validate password
    const validation = Object.values(passwordValidation);
    if (!validation.every(Boolean)) {
      setError('Password does not meet all requirements');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError('');

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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to reset password');
      }

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Password reset successfully! Please log in with your new password.' 
          } 
        });
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (): number => {
    const validCount = Object.values(passwordValidation).filter(Boolean).length;
    return (validCount / 5) * 100;
  };

  const getPasswordStrengthColor = (): 'error' | 'warning' | 'success' => {
    const strength = getPasswordStrength();
    if (strength < 40) return 'error';
    if (strength < 80) return 'warning';
    return 'success';
  };

  const getPasswordStrengthText = (): string => {
    const strength = getPasswordStrength();
    if (strength < 40) return 'Weak';
    if (strength < 80) return 'Good';
    return 'Strong';
  };

  if (success) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bgcolor="grey.50"
      >
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          
          {mode === 'request' ? (
            <>
              <Typography variant="h4" gutterBottom color="success.main">
                Email Sent!
              </Typography>
              <Typography variant="h6" gutterBottom>
                Check Your Inbox
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                If an account with that email exists, we've sent you a password reset link. 
                Please check your email and follow the instructions to reset your password.
              </Typography>
              <Card sx={{ bgcolor: 'info.50', mb: 3 }}>
                <CardContent>
                  <Typography variant="body2">
                    <strong>What's next?</strong><br />
                    1. Check your email (including spam folder)<br />
                    2. Click the reset link in the email<br />
                    3. Create your new password<br />
                    4. Log in with your new credentials
                  </Typography>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Typography variant="h4" gutterBottom color="success.main">
                Password Reset!
              </Typography>
              <Typography variant="h6" gutterBottom>
                Successfully Updated
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Your password has been successfully reset. You can now log in with your new password.
                You will be redirected to the login page shortly.
              </Typography>
            </>
          )}
          
          <Button 
            variant="contained" 
            onClick={() => navigate('/login')}
            size="large"
            startIcon={<ArrowBackIcon />}
          >
            Go to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box bgcolor="grey.50" minHeight="100vh" py={4}>
      <Box maxWidth="md" mx="auto" px={2}>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            🔐 Password Reset
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {mode === 'request' 
              ? 'Enter your email address to receive a password reset link'
              : 'Create a new password for your account'
            }
          </Typography>
        </Paper>

        {/* Progress Indicator */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={mode === 'request' ? 0 : 1} alternativeLabel>
            <Step>
              <StepLabel>Request Reset</StepLabel>
            </Step>
            <Step>
              <StepLabel>Create New Password</StepLabel>
            </Step>
          </Stepper>
        </Paper>

        {/* Main Content */}
        <Paper sx={{ p: 4 }}>
          {mode === 'request' ? (
            <Box>
              <Typography variant="h5" gutterBottom>
                <EmailIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Request Password Reset
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Enter the email address associated with your account and we'll send you a link to reset your password.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="email"
                    label="Email Address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    required
                    autoFocus
                    placeholder="Enter your email address"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Card sx={{ bgcolor: 'info.50' }}>
                    <CardContent>
                      <Typography variant="body2">
                        <strong>Security Notice:</strong><br />
                        • Reset links expire after 1 hour for security<br />
                        • Each link can only be used once<br />
                        • If you don't receive an email, check your spam folder<br />
                        • Contact your administrator if you continue having issues
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {error && (
                <Alert severity="error" sx={{ mt: 3 }}>
                  {error}
                </Alert>
              )}

              <Box display="flex" justifyContent="space-between" mt={4}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/login')}
                  startIcon={<ArrowBackIcon />}
                >
                  Back to Login
                </Button>
                
                <LoadingButton
                  loading={loading}
                  variant="contained"
                  onClick={handleRequestReset}
                  disabled={!email}
                  size="large"
                  startIcon={<SendIcon />}
                >
                  Send Reset Link
                </LoadingButton>
              </Box>
            </Box>
          ) : (
            <Box>
              <Typography variant="h5" gutterBottom>
                <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Create New Password
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Please create a strong new password for your account.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    label="New Password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError('');
                    }}
                    required
                    autoFocus
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon />
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
                  />
                  
                  {newPassword && (
                    <Box sx={{ mt: 2 }}>
                      <Box display="flex" alignItems="center" gap={2} mb={1}>
                        <Typography variant="body2">
                          Password Strength: <strong>{getPasswordStrengthText()}</strong>
                        </Typography>
                        <Box flexGrow={1}>
                          <LinearProgress
                            variant="determinate"
                            value={getPasswordStrength()}
                            color={getPasswordStrengthColor()}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      </Box>
                      
                      <List dense>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon 
                              sx={{ 
                                color: passwordValidation.length ? 'success.main' : 'grey.400',
                                fontSize: 20 
                              }} 
                            />
                          </ListItemIcon>
                          <ListItemText primary="At least 8 characters" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon 
                              sx={{ 
                                color: passwordValidation.lowercase ? 'success.main' : 'grey.400',
                                fontSize: 20 
                              }} 
                            />
                          </ListItemIcon>
                          <ListItemText primary="One lowercase letter" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon 
                              sx={{ 
                                color: passwordValidation.uppercase ? 'success.main' : 'grey.400',
                                fontSize: 20 
                              }} 
                            />
                          </ListItemIcon>
                          <ListItemText primary="One uppercase letter" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon 
                              sx={{ 
                                color: passwordValidation.number ? 'success.main' : 'grey.400',
                                fontSize: 20 
                              }} 
                            />
                          </ListItemIcon>
                          <ListItemText primary="One number" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon 
                              sx={{ 
                                color: passwordValidation.special ? 'success.main' : 'grey.400',
                                fontSize: 20 
                              }} 
                            />
                          </ListItemIcon>
                          <ListItemText primary="One special character" />
                        </ListItem>
                      </List>
                    </Box>
                  )}
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type={showConfirmPassword ? 'text' : 'password'}
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    required
                    error={confirmPassword !== '' && newPassword !== confirmPassword}
                    helperText={
                      confirmPassword !== '' && newPassword !== confirmPassword
                        ? 'Passwords do not match'
                        : ''
                    }
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
                  />
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Security Tips:</strong><br />
                      • Use a unique password that you don't use elsewhere<br />
                      • Consider using a password manager<br />
                      • Your new password will be securely encrypted<br />
                      • Log out of all devices after changing your password
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>

              {error && (
                <Alert severity="error" sx={{ mt: 3 }}>
                  {error}
                </Alert>
              )}

              <Box display="flex" justifyContent="space-between" mt={4}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/login')}
                  startIcon={<ArrowBackIcon />}
                >
                  Back to Login
                </Button>
                
                <LoadingButton
                  loading={loading}
                  variant="contained"
                  onClick={handleResetPassword}
                  disabled={
                    !Object.values(passwordValidation).every(Boolean) || 
                    newPassword !== confirmPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                  size="large"
                >
                  Reset Password
                </LoadingButton>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default PasswordReset; 