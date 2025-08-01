import React from 'react';
import { Grid, Card, CardContent, Typography } from '@mui/material';
import { SystemUser } from '../../../types/system';

export const SystemUsersStats: React.FC = () => {
  // TODO: Replace with actual hook when implemented
  const users: SystemUser[] = [
    {
      id: 3,
      email: 'elliot.vergne@gmail.com',
      first_name: 'Elliot',
      last_name: 'Vergne',
      role: 'system_admin',
      is_active: true,
      last_login: '2025-08-01T10:00:00Z',
      created_at: '2025-07-31T20:30:05Z'
    }
  ]; // Mock data

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'system_admin').length,
    operators: users.filter(u => u.role === 'system_operator').length,
    active: users.filter(u => u.is_active).length
  };

  const statCards = [
    { label: 'Total Utilisateurs', value: stats.total },
    { label: 'Administrateurs', value: stats.admins },
    { label: 'Opérateurs', value: stats.operators },
    { label: 'Actifs', value: stats.active }
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