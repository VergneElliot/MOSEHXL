import React from 'react';
import { Grid, Card, CardContent, Typography } from '@mui/material';
import { SystemSecurityLog } from '../../../types/system';

export const SecurityLogsStats: React.FC = () => {
  // TODO: Replace with actual hook when implemented
  const logs: SystemSecurityLog[] = []; // Mock data

  const stats = {
    total: logs.length,
    critical: logs.filter(log => log.severity === 'critical').length,
    high: logs.filter(log => log.severity === 'high').length,
    today: logs.filter(log => {
      const today = new Date().toISOString().split('T')[0];
      return log.timestamp.startsWith(today);
    }).length
  };

  const statCards = [
    { label: 'Total Événements', value: stats.total },
    { label: 'Critiques', value: stats.critical, color: '#f44336' },
    { label: 'Élevés', value: stats.high, color: '#ff9800' },
    { label: 'Aujourd\'hui', value: stats.today }
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
              <Typography 
                variant="h4" 
                sx={{ color: stat.color || 'text.primary' }}
              >
                {stat.value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};