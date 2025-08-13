/**
 * Completion Step - Setup success and next steps
 */

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert
} from '@mui/material';
import { 
  CheckCircle, 
  Login,
  Dashboard,
  MenuBook,
  People,
  Assessment,
  Settings,
  ShoppingCart
} from '@mui/icons-material';

export const CompletionStep: React.FC = () => {
  // Confetti effect or celebration animation could be added here
  useEffect(() => {
    // Optional: Add celebration effects
  // console.info('Business setup completed successfully!');
  }, []);

  const handleLoginRedirect = () => {
    // Clear any setup-related data and redirect to login
    window.location.href = '/login';
  };

  const features = [
    {
      icon: <ShoppingCart color="primary" />,
      title: 'Point of Sale (POS)',
      description: 'Process orders, handle payments, and manage transactions'
    },
    {
      icon: <MenuBook color="primary" />,
      title: 'Menu Management',
      description: 'Add products, categories, pricing, and manage inventory'
    },
    {
      icon: <People color="primary" />,
      title: 'User Management',
      description: 'Add staff members and manage user permissions'
    },
    {
      icon: <Assessment color="primary" />,
      title: 'Analytics & Reports',
      description: 'Track sales, monitor performance, and generate reports'
    },
    {
      icon: <Settings color="primary" />,
      title: 'Business Settings',
      description: 'Configure happy hour, legal compliance, and preferences'
    },
    {
      icon: <Dashboard color="primary" />,
      title: 'Management Dashboard',
      description: 'Overview of your business performance and operations'
    }
  ];

  return (
    <Box textAlign="center">
      {/* Success Header */}
      <Box mb={4}>
        <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h3" gutterBottom color="success.main">
          🎉 Setup Complete!
        </Typography>
        <Typography variant="h5" gutterBottom>
          Welcome to MOSEHXL
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your business POS system has been successfully configured and is ready to use.
        </Typography>
      </Box>

      {/* Success Message */}
      <Alert severity="success" sx={{ mb: 4, textAlign: 'left' }}>
        <Typography variant="body1" gutterBottom>
          <strong>Congratulations!</strong> Your business management system is now active.
        </Typography>
        <Typography variant="body2">
          You can now log in with your credentials to access your dedicated POS system 
          with all the tools you need to manage your establishment efficiently.
        </Typography>
      </Alert>

      {/* Available Features */}
      <Box mb={4}>
        <Typography variant="h5" gutterBottom>
          Available Features
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Your POS system includes all these powerful features:
        </Typography>

        <Grid container spacing={2}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card elevation={1} sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="flex-start">
                    <Box sx={{ mr: 2, mt: 0.5 }}>
                      {feature.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Next Steps */}
      <Card elevation={2} sx={{ mb: 4, bgcolor: 'primary.50' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Next Steps
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <Login color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Log in to your system"
                secondary="Use your email and password to access your business dashboard"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <MenuBook color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Set up your menu"
                secondary="Add categories, products, and pricing for your establishment"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <People color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Add your staff"
                secondary="Invite team members and configure their access levels"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Settings color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Configure settings"
                secondary="Customize business hours, happy hour, and operational preferences"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Login Button */}
      <Box>
        <Button
          variant="contained"
          size="large"
          onClick={handleLoginRedirect}
          startIcon={<Login />}
          sx={{ 
            minWidth: 250,
            fontSize: '1.1rem',
            py: 1.5
          }}
        >
          Access Your POS System
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Use your email and password to log in
        </Typography>
      </Box>
    </Box>
  );
};