/**
 * Completion Step Component
 * Step 4: Review and finalize establishment account creation
 */

import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Alert,
  Card,
  CardContent,
  Grid,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  CheckCircle, 
  Business, 
  LocationOn, 
  Receipt, 
  Security,
  Store,
  AccountBalance,
  Email
} from '@mui/icons-material';
import { BusinessInfo } from '../types';

interface CompletionStepProps {
  businessInfo: BusinessInfo | null;
  onComplete: () => void;
  onError: (error: string) => void;
  isLoading: boolean;
}

const CompletionStep: React.FC<CompletionStepProps> = ({
  businessInfo,
  onComplete,
  onError,
  isLoading
}) => {
  const handleCompleteSetup = () => {
    if (!businessInfo) {
      onError('Business information is missing');
      return;
    }
    onComplete();
  };

  const getBusinessTypeIcon = (businessType: string) => {
    switch (businessType.toLowerCase()) {
      case 'restaurant':
      case 'bar':
      case 'café':
      case 'bistro':
      case 'brasserie':
        return <Store />;
      case 'fast food':
      case 'food truck':
        return <Receipt />;
      default:
        return <Business />;
    }
  };

  if (!businessInfo) {
    return (
      <Box>
        <Alert severity="error">
          Business information is missing. Please go back and complete the previous step.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Step 4: Review and Complete Setup
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Please review your business information before finalizing your account creation.
      </Typography>

      {/* Business Information Review */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Business color="primary" />
            <Typography variant="h6">
              Business Information Review
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Company Details */}
            <Grid item xs={12} md={6}>
              <Box mb={2}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Company Information
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Business fontSize="small" color="primary" />
                  <Typography variant="body1" fontWeight="medium">
                    {businessInfo.companyName}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  {getBusinessTypeIcon(businessInfo.businessType)}
                  <Typography variant="body2" color="text.secondary">
                    {businessInfo.businessType}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <AccountBalance fontSize="small" color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    {businessInfo.country}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Tax Information */}
            <Grid item xs={12} md={6}>
              <Box mb={2}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Tax Information
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Receipt fontSize="small" color="primary" />
                  <Typography variant="body2">
                    SIREN: {businessInfo.taxId}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Receipt fontSize="small" color="primary" />
                  <Typography variant="body2">
                    SIRET: {businessInfo.siretNumber}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Address Information */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <LocationOn fontSize="small" color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Business Address
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ ml: 3 }}>
                {businessInfo.address}
              </Typography>
              <Typography variant="body2" sx={{ ml: 3 }}>
                {businessInfo.postalCode} {businessInfo.city}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* What Happens Next */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            What Happens Next?
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Account Creation"
                secondary="Your establishment account will be created with secure access"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <Security color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Data Isolation"
                secondary="Your business data will be completely isolated from other establishments"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <Store color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="POS System Access"
                secondary="You'll gain access to your dedicated POS system with menu management"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <Email color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Confirmation Email"
                secondary="You'll receive a confirmation email with login instructions"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Security Notice:</strong> Your business data is protected with enterprise-grade security. 
          Each establishment operates in its own isolated environment to ensure complete data privacy.
        </Typography>
      </Alert>

      {/* Action Buttons */}
      <Box display="flex" justifyContent="center" gap={2}>
        <Button
          variant="outlined"
          size="large"
          disabled={isLoading}
          onClick={() => window.history.back()}
        >
          Go Back
        </Button>
        
        <Button
          variant="contained"
          size="large"
          onClick={handleCompleteSetup}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : <CheckCircle />}
          sx={{ minWidth: 200 }}
        >
          {isLoading ? 'Creating Account...' : 'Complete Setup'}
        </Button>
      </Box>

      {isLoading && (
        <Box display="flex" justifyContent="center" mt={2}>
          <Typography variant="body2" color="text.secondary">
            This may take a few moments. Please don't close this page.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default CompletionStep;
