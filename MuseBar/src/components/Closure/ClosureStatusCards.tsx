import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  AlertTitle,
  useTheme,
  CircularProgress,
} from '@mui/material';
import { Receipt, Schedule, TrendingUp, Assignment, Security, Lock } from '@mui/icons-material';

interface ClosureStatusCardsProps {
  todayStatus: any;
  monthlyStats: any;
  monthlyStatsError: string | null;
  loading: boolean;
  formatCurrency: (amount: number) => string;
}

const ClosureStatusCards: React.FC<ClosureStatusCardsProps> = ({
  todayStatus,
  monthlyStats,
  monthlyStatsError,
  loading,
  formatCurrency,
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="center" py={3}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Chargement du statut...</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      {/* Today Status Alert */}
      {todayStatus && (
        <Alert
          severity={todayStatus.has_daily_closure ? 'success' : 'warning'}
          sx={{ mb: 2 }}
          icon={todayStatus.has_daily_closure ? <Lock /> : <Schedule />}
        >
          <AlertTitle>
            {todayStatus.has_daily_closure
              ? 'Clôture journalière effectuée'
              : 'Clôture journalière en attente'}
          </AlertTitle>
          {todayStatus.has_daily_closure ? (
            <Typography variant="body2">
              Clôture effectuée le {new Date(todayStatus.closure_date).toLocaleDateString('fr-FR')}-{' '}
              {todayStatus.total_transactions} transactions pour{' '}
              {formatCurrency(todayStatus.total_amount)}
            </Typography>
          ) : (
            <Typography variant="body2">
              La clôture journalière n'a pas encore été effectuée pour aujourd'hui. Période
              d'activité en cours : {todayStatus.transactions_today} transactions.
            </Typography>
          )}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={2}>
        {/* Daily Stats */}
        {todayStatus && (
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: `${theme.palette.primary.main}20`,
                      color: theme.palette.primary.main,
                      mr: 2,
                    }}
                  >
                    <Receipt />
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    Aujourd'hui
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight="bold">
                  {todayStatus.transactions_today || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Transactions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Monthly Stats */}
        {monthlyStats && !monthlyStatsError && (
          <>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        backgroundColor: `${theme.palette.success.main}20`,
                        color: theme.palette.success.main,
                        mr: 2,
                      }}
                    >
                      <TrendingUp />
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      CA Mensuel
                    </Typography>
                  </Box>
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    {formatCurrency(monthlyStats.total_amount || 0)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {monthlyStats.total_transactions || 0} transactions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        backgroundColor: `${theme.palette.info.main}20`,
                        color: theme.palette.info.main,
                        mr: 2,
                      }}
                    >
                      <Assignment />
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      Moyenne/Jour
                    </Typography>
                  </Box>
                  <Typography variant="h6" fontWeight="bold" color="info.main">
                    {formatCurrency(monthlyStats.avg_daily_amount || 0)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {Math.round(monthlyStats.avg_daily_transactions || 0)} transactions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        backgroundColor: `${theme.palette.warning.main}20`,
                        color: theme.palette.warning.main,
                        mr: 2,
                      }}
                    >
                      <Security />
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      Clôtures
                    </Typography>
                  </Box>
                  <Typography variant="h6" fontWeight="bold" color="warning.main">
                    {monthlyStats.closure_count || 0}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Ce mois
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Monthly Stats Error */}
        {monthlyStatsError && (
          <Grid item xs={12} md={9}>
            <Alert severity="warning">
              <AlertTitle>Statistiques mensuelles indisponibles</AlertTitle>
              {monthlyStatsError}
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default ClosureStatusCards;
