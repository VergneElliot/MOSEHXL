import React from 'react';
import { Grid, Card, CardContent, Typography } from '@mui/material';
import type { SystemSecurityLog } from '../../../types/system';

interface SecurityLogsStatsProps {
  logs: SystemSecurityLog[];
  total: number;
}

export const SecurityLogsStats: React.FC<SecurityLogsStatsProps> = ({ logs, total }) => {
  const todayPrefix = new Date().toISOString().split('T')[0] ?? '';
  const stats = {
    total,
    critical: logs.filter((log) => log.severity === 'critical').length,
    high: logs.filter((log) => log.severity === 'high').length,
    today: logs.filter((log) => log.timestamp.startsWith(todayPrefix)).length,
  };

  const statCards = [
    { label: 'Total Événements', value: stats.total },
    { label: 'Critiques (page)', value: stats.critical, color: '#f44336' },
    { label: 'Élevés (page)', value: stats.high, color: '#ff9800' },
    { label: "Aujourd'hui (page)", value: stats.today },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {statCards.map((stat) => (
        <Grid item xs={12} sm={6} md={3} key={stat.label}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                {stat.label}
              </Typography>
              <Typography variant="h4" sx={{ color: stat.color || 'text.primary' }}>
                {stat.value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
