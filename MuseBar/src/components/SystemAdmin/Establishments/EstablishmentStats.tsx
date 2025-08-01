import React from 'react';
import { Grid, Card, CardContent, Typography } from '@mui/material';
import { useEstablishments } from '../../../hooks/useEstablishments';

export const EstablishmentStats: React.FC = () => {
  const { establishments } = useEstablishments();

  const stats = {
    total: establishments.length,
    active: establishments.filter(e => e.status === 'active').length,
    premium: establishments.filter(e => e.subscription_plan === 'premium').length,
    pending: establishments.filter(e => e.status === 'pending').length
  };

  const statCards = [
    { label: 'Total Établissements', value: stats.total },
    { label: 'Actifs', value: stats.active },
    { label: 'Plans Premium', value: stats.premium },
    { label: 'En Attente', value: stats.pending }
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {statCards.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                {stat.label}
              </Typography>
              <Typography variant="h4">
                {stat.value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};