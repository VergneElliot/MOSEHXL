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
  useMediaQuery,
} from '@mui/material';
import {
  Schedule,
  TrendingUp,
  Assignment,
  Security,
  Lock,
  Receipt,
  MonetizationOn,
  SwapHoriz,
} from '@mui/icons-material';
import type { ClosureTodayStatus, LiveMonthlyStats } from '../../types';
import { formatDateOnly } from '../../utils/formatDate';

interface ClosureStatusCardsProps {
  todayStatus: ClosureTodayStatus | null;
  monthlyStats: LiveMonthlyStats | null;
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
  const isShortScreen = useMediaQuery('(max-height: 900px)');

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
    <Box
      sx={{
        mb: isShortScreen ? 1.5 : 3,
        ...(isShortScreen && {
          '& .MuiCardContent-root': { p: 1.25, '&:last-child': { pb: 1.25 } },
          '& .MuiSvgIcon-root': { fontSize: 18 },
        }),
      }}
    >
      {/* Today Status Alert */}
      {todayStatus && (
        <Alert
          severity={todayStatus.has_closure ? 'success' : 'warning'}
          sx={{ mb: isShortScreen ? 1 : 2, py: isShortScreen ? 0.25 : 0.75 }}
          icon={todayStatus.has_closure ? <Lock /> : <Schedule />}
        >
          <AlertTitle>
            {todayStatus.has_closure
              ? 'Clôture journalière effectuée'
              : 'Clôture journalière en attente'}
          </AlertTitle>
          {todayStatus.has_closure && todayStatus.bulletin ? (
            <Typography variant="body2">
              Clôture effectuée le{' '}
              {todayStatus.bulletin.period_end
                ? formatDateOnly(todayStatus.bulletin.period_end)
                : 'N/A'}{' '}
              — {formatCurrency(todayStatus.bulletin.total_amount || 0)}
            </Typography>
          ) : (
            <Typography variant="body2">
              La clôture journalière n'a pas encore été effectuée pour aujourd'hui.
            </Typography>
          )}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={isShortScreen ? 1 : 2}>
        {/* Monthly Stats (ongoing month totals, based on orders) */}
        {monthlyStats && !monthlyStatsError && (
          <>
            <Grid item xs={6} md={4}>
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
                    <Typography variant={isShortScreen ? 'caption' : 'body2'} color="textSecondary">
                      Transactions (mois en cours)
                    </Typography>
                  </Box>
                  <Typography variant={isShortScreen ? 'body1' : 'h6'} fontWeight="bold">
                    {monthlyStats.total_transactions || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={4}>
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
                    <Typography variant={isShortScreen ? 'caption' : 'body2'} color="textSecondary">
                      Chiffre d&apos;affaires
                    </Typography>
                  </Box>
                  <Typography variant={isShortScreen ? 'body1' : 'h6'} fontWeight="bold" color="success.main">
                    {formatCurrency(monthlyStats.total_amount || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={4}>
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
                    <Typography variant={isShortScreen ? 'caption' : 'body2'} color="textSecondary">
                      TVA collectée
                    </Typography>
                  </Box>
                  <Typography variant={isShortScreen ? 'body1' : 'h6'} fontWeight="bold" color="info.main">
                    {formatCurrency(monthlyStats.total_vat || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        backgroundColor: `${theme.palette.secondary.main}20`,
                        color: theme.palette.secondary.main,
                        mr: 2,
                      }}
                    >
                      <MonetizationOn />
                    </Box>
                    <Typography variant={isShortScreen ? 'caption' : 'body2'} color="textSecondary">
                      Total pourboires
                    </Typography>
                  </Box>
                  <Typography variant={isShortScreen ? 'body1' : 'h6'} fontWeight="bold">
                    {formatCurrency(monthlyStats.tips_total || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={4}>
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
                      <SwapHoriz />
                    </Box>
                    <Typography variant={isShortScreen ? 'caption' : 'body2'} color="textSecondary">
                      Monnaie rendue
                    </Typography>
                  </Box>
                  <Typography variant={isShortScreen ? 'body1' : 'h6'} fontWeight="bold" color="warning.main">
                    {formatCurrency(monthlyStats.change_total || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={4}>
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
                      <Security />
                    </Box>
                    <Typography variant={isShortScreen ? 'caption' : 'body2'} color="textSecondary">
                      Bulletins de clôture
                    </Typography>
                  </Box>
                  <Typography variant={isShortScreen ? 'body1' : 'h6'} fontWeight="bold" color="success.main">
                    {monthlyStats.closure_count || 0}
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
