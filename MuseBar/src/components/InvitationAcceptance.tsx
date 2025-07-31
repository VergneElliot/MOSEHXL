/**
 * Invitation Acceptance Component
 * Handles the user invitation acceptance flow with account setup
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
  Stepper,
  Step,
  StepLabel,
  Grid,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { LoadingButton } from '../components/common/LoadingStates';

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

interface AccountSetupData {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}

interface PasswordValidation {
  length: boolean;
  lowercase: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
}

const InvitationAcceptance: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  // State management
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form data
  const [accountData, setAccountData] = useState<AccountSetupData>({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });

  // Password validation
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    special: false,
  });

  const steps = ['Validate Invitation', 'Personal Information', 'Account Security', 'Complete Setup'];

  // Validate invitation token on component mount
  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setValidating(false);
      return;
    }

    validateInvitation();
  }, [token]);

  // Update password validation in real-time
  useEffect(() => {
    if (accountData.password) {
      setPasswordValidation({
        length: accountData.password.length >= 8,
        lowercase: /[a-z]/.test(accountData.password),
        uppercase: /[A-Z]/.test(accountData.password),
        number: /\d/.test(accountData.password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(accountData.password),
      });
    }
  }, [accountData.password]);

  // Update form data when invitation is loaded
  useEffect(() => {
    if (invitation?.prefill) {
      setAccountData(prev => ({
        ...prev,
        firstName: invitation.prefill.firstName || '',
        lastName: invitation.prefill.lastName || '',
      }));
    }
  }, [invitation]);

  const validateInvitation = async () => {
    try {
      setValidating(true);
      const response = await fetch(`/api/user-management/validate-invitation/${token}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Invalid invitation token');
      }

      setInvitation(result.data);
      setActiveStep(1); // Move to personal information step
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate invitation');
    } finally {
      setValidating(false);
    }
  };

  const handleInputChange = (field: keyof AccountSetupData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setAccountData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError(''); // Clear errors when user starts typing
  };

  const validatePersonalInfo = (): boolean => {
    if (!accountData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!accountData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    return true;
  };

  const validatePassword = (): boolean => {
    const validation = Object.values(passwordValidation);
    if (!validation.every(Boolean)) {
      setError('Password does not meet all requirements');
      return false;
    }
    if (accountData.password !== accountData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    
    if (activeStep === 1) { // Personal Information
      if (validatePersonalInfo()) {
        setActiveStep(2);
      }
    } else if (activeStep === 2) { // Account Security
      if (validatePassword()) {
        setActiveStep(3);
      }
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!validatePersonalInfo() || !validatePassword()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/user-management/accept-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          ...accountData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create account');
      }

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Account created successfully! Please log in.',
            email: invitation?.email 
          } 
        });
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
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

  if (validating) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bgcolor="grey.50"
      >
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">Validating invitation...</Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we verify your invitation token.
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (error && !invitation) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bgcolor="grey.50"
      >
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
          <Typography variant="h5" gutterBottom color="error">
            Invalid Invitation
          </Typography>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This invitation link may have expired or been used already. 
            Please contact your administrator for a new invitation.
          </Typography>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/login')}
            startIcon={<ArrowBackIcon />}
          >
            Go to Login
          </Button>
        </Paper>
      </Box>
    );
  }

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
          <Typography variant="h4" gutterBottom color="success.main">
            Welcome to MuseBar!
          </Typography>
          <Typography variant="h6" gutterBottom>
            Account Created Successfully
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Your account has been created for <strong>{invitation?.establishmentName}</strong>.
            You will be redirected to the login page shortly.
          </Typography>
          <Card sx={{ bgcolor: 'success.50', mb: 3 }}>
            <CardContent>
              <Typography variant="body2">
                <strong>Email:</strong> {invitation?.email}<br />
                <strong>Role:</strong> {invitation?.role}<br />
                <strong>Establishment:</strong> {invitation?.establishmentName}
              </Typography>
            </CardContent>
          </Card>
          <Button 
            variant="contained" 
            onClick={() => navigate('/login')}
            size="large"
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
            🍺 Complete Your MuseBar Account
          </Typography>
          <Typography variant="body1" color="text.secondary">
            You've been invited to join <strong>{invitation?.establishmentName}</strong>
          </Typography>
        </Paper>

        {/* Stepper */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Step Content */}
        <Paper sx={{ p: 4 }}>
          {activeStep === 1 && (
            <Box>
              <Typography variant="h5" gutterBottom>
                <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Personal Information
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Please provide your personal details to complete your account setup.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={accountData.firstName}
                    onChange={handleInputChange('firstName')}
                    required
                    autoFocus
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={accountData.lastName}
                    onChange={handleInputChange('lastName')}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Card sx={{ bgcolor: 'info.50' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Invitation Details
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2">
                            <strong>Email:</strong> {invitation?.email}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2">
                            <strong>Establishment:</strong> {invitation?.establishmentName}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2">
                            <strong>Role:</strong> <Chip label={invitation?.role} size="small" />
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2">
                            <strong>Invited by:</strong> {invitation?.inviterName}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {activeStep === 2 && (
            <Box>
              <Typography variant="h5" gutterBottom>
                <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Account Security
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create a strong password to secure your account.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    label="Password"
                    value={accountData.password}
                    onChange={handleInputChange('password')}
                    required
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
                  
                  {accountData.password && (
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
                    label="Confirm Password"
                    value={accountData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    required
                    error={accountData.confirmPassword !== '' && accountData.password !== accountData.confirmPassword}
                    helperText={
                      accountData.confirmPassword !== '' && accountData.password !== accountData.confirmPassword
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
            </Box>
          )}

          {activeStep === 3 && (
            <Box>
              <Typography variant="h5" gutterBottom>
                <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Review & Complete
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Please review your information before completing the account setup.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Personal Information</Typography>
                      <Typography variant="body2">
                        <strong>Name:</strong> {accountData.firstName} {accountData.lastName}<br />
                        <strong>Email:</strong> {invitation?.email}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Account Details</Typography>
                      <Typography variant="body2">
                        <strong>Establishment:</strong> {invitation?.establishmentName}<br />
                        <strong>Role:</strong> <Chip label={invitation?.role} size="small" /><br />
                        <strong>Invited by:</strong> {invitation?.inviterName}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      By creating this account, you agree to the terms of service and privacy policy 
                      of the MuseBar POS system. Your password is securely encrypted and cannot be 
                      viewed by administrators.
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {error}
            </Alert>
          )}

          {/* Navigation Buttons */}
          <Box display="flex" justifyContent="space-between" mt={4}>
            <Button
              disabled={activeStep === 1}
              onClick={handleBack}
              startIcon={<ArrowBackIcon />}
            >
              Back
            </Button>
            
            <Box>
              {activeStep < 3 ? (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={
                    (activeStep === 1 && (!accountData.firstName || !accountData.lastName)) ||
                    (activeStep === 2 && (!Object.values(passwordValidation).every(Boolean) || accountData.password !== accountData.confirmPassword))
                  }
                >
                  Next
                </Button>
              ) : (
                <LoadingButton
                  loading={loading}
                  variant="contained"
                  onClick={handleSubmit}
                  size="large"
                >
                  Create Account
                </LoadingButton>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default InvitationAcceptance; 