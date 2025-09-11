import React, { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Typography, CircularProgress, Alert } from '@mui/material';
import { EstablishmentService } from '../../../services/establishmentService';
import { ensureAuthentication } from '../../../services/authHelper';

interface EstablishmentStatsData {
  total_establishments: string;
  pending_setup: string;
  active: string;
  suspended: string;
  this_month: string;
}

export const EstablishmentStats: React.FC = () => {
  const [stats, setStats] = useState<EstablishmentStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        ensureAuthentication(); // Ensure token is set
        const statsData = await EstablishmentService.getEstablishmentStats();
        setStats(statsData);
      } catch (err) {
        console.error('Error loading establishment stats:', err);
        setError('Erreur lors du chargement des statistiques');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Chargement des statistiques...
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  if (error) {
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      </Grid>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: 'Total Établissements', value: stats.total_establishments },
    { label: 'Actifs', value: stats.active },
    { label: 'En Configuration', value: stats.pending_setup },
    { label: 'Suspendus', value: stats.suspended }
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