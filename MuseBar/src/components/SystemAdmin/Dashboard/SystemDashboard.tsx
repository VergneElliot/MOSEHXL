import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { DashboardCard } from './DashboardCard';
import { QuickActions } from './QuickActions';
import { Business, People, Security } from '@mui/icons-material';

const SystemDashboard: React.FC = () => {
  const dashboardItems = [
    {
      title: 'Gestion Établissements',
      description: 'Créer et gérer les établissements clients',
      icon: Business,
      route: '/system/establishments',
      color: '#1976d2'
    },
    {
      title: 'Gestion Utilisateurs',
      description: 'Gérer les administrateurs système',
      icon: People,
      route: '/system/users',
      color: '#388e3c'
    },
    {
      title: 'Journal de Sécurité',
      description: 'Consulter les logs système',
      icon: Security,
      route: '/system/security-logs',
      color: '#f57c00'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Tableau de Bord - Administrateur Système
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {dashboardItems.map((item, index) => (
          <Grid item xs={12} md={4} key={index}>
            <DashboardCard {...item} />
          </Grid>
        ))}
      </Grid>

      <QuickActions />
    </Box>
  );
};

export default SystemDashboard;