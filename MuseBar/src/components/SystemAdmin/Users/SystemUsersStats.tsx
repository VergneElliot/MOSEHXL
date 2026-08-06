import React, { useMemo } from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import {
  People as PeopleIcon,
  AdminPanelSettings as AdminIcon,
  CheckCircle as ActiveIcon,
} from '@mui/icons-material';
import { SystemUser } from '../../../types/system';

interface SystemUsersStatsProps {
  users: SystemUser[];
}

export const SystemUsersStats: React.FC<SystemUsersStatsProps> = ({ users }) => {
  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((u) => u.role === 'system_admin').length,
      active: users.filter((u) => u.is_active).length,
    }),
    [users]
  );

  const cards = [
    { label: 'Total', value: stats.total, icon: <PeopleIcon color="primary" /> },
    { label: 'Administrateurs', value: stats.admins, icon: <AdminIcon color="error" /> },
    { label: 'Actifs', value: stats.active, icon: <ActiveIcon color="success" /> },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card) => (
        <Grid item xs={12} sm={4} key={card.label}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            {card.icon}
            <Box>
              <Typography variant="h5">{card.value}</Typography>
              <Typography variant="body2" color="text.secondary">
                {card.label}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};
