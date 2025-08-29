/**
 * Establishment Statistics Cards Component
 * Displays overview statistics for establishments
 */

import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Box,
  Typography
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { Establishment } from './types';

interface EstablishmentStatsProps {
  establishments: Establishment[];
}

const EstablishmentStats: React.FC<EstablishmentStatsProps> = ({ establishments }) => {
  const totalEstablishments = establishments.length;
  const activeEstablishments = establishments.filter(e => e.subscription_status === 'active').length;
  const premiumPlans = establishments.filter(e => 
    e.subscription_plan === 'premium' || e.subscription_plan === 'enterprise'
  ).length;
  const suspendedEstablishments = establishments.filter(e => e.subscription_status === 'suspended').length;

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <BusinessIcon color="primary" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="h6">{totalEstablishments}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Total Establishments
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <PeopleIcon color="primary" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="h6">{activeEstablishments}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Active Establishments
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <MoneyIcon color="primary" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="h6">{premiumPlans}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Premium Plans
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <EmailIcon color="primary" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="h6">{suspendedEstablishments}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Suspended
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default EstablishmentStats;

