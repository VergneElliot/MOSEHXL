import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { CreditCard, Money, TrendingUp, LocalOffer } from '@mui/icons-material';
import { HistoryStats } from '../../hooks/useHistoryState';

interface StatsCardsProps {
  stats: HistoryStats;
  loading: boolean;
  formatCurrency: (amount: number) => string;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading, formatCurrency }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const topN = isMobile ? 3 : 5;
  const topProduits = stats.topProduits.slice(0, topN);

  const statsData = [
    {
      title: 'CA du Jour',
      value: formatCurrency(stats.caJour),
      icon: <TrendingUp />,
      color: theme.palette.success.main,
      description: "Chiffre d'affaires total",
      isTopProducts: false,
    },
    {
      title: 'Top ventes du jour',
      icon: <LocalOffer />,
      color: theme.palette.primary.main,
      description: `Top ${topN} produits`,
      isTopProducts: true,
    },
    {
      title: 'Paiements Carte',
      value: formatCurrency(stats.cardTotal),
      icon: <CreditCard />,
      color: theme.palette.info.main,
      description: 'Total paiements par carte',
      isTopProducts: false,
    },
    {
      title: 'Paiements Espèces',
      value: formatCurrency(stats.cashTotal),
      icon: <Money />,
      color: theme.palette.warning.main,
      description: 'Total paiements en espèces',
      isTopProducts: false,
    },
  ];

  if (loading) {
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statsData.map((_, index) => (
          <Grid item xs={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    height: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography color="textSecondary">Chargement...</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {statsData.map((stat, index) => (
          <Grid item xs={6} md={3} key={index}>
            <Card
              sx={{
                height: '100%',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3,
                },
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: `${stat.color}20`,
                      color: stat.color,
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {stat.icon}
                  </Box>

                  <Box flexGrow={1}>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                    >
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>

                <Typography
                  variant={stat.isTopProducts ? undefined : (isMobile ? 'h6' : 'h5')}
                  component={stat.isTopProducts ? 'div' : 'p'}
                  sx={{
                    fontWeight: 'bold',
                    color: stat.color,
                    mb: 0.5,
                    ...(stat.isTopProducts && {
                      fontWeight: 500,
                      maxHeight: isMobile ? 72 : 100,
                      overflow: 'auto',
                    }),
                  }}
                >
                  {stat.isTopProducts ? (
                    topProduits.length === 0 ? (
                      '—'
                    ) : (
                      <Box component="ol" sx={{ m: 0, pl: 2, '& li': { py: 0.2 } }}>
                        {topProduits.map((p, i) => (
                          <li key={i}>
                            <Typography component="span" variant="body2" noWrap sx={{ display: 'block' }}>
                              {p.name} <Typography component="span" color="textSecondary">({p.qty})</Typography>
                            </Typography>
                          </li>
                        ))}
                      </Box>
                    )
                  ) : (
                    stat.value
                  )}
                </Typography>

                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                >
                  {stat.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Business Day Period Info */}
      {stats.businessDayPeriod && (
        <Box mt={2}>
          <Typography variant="body2" color="textSecondary" align="center">
            📅 Période d'activité:{' '}
            {new Date(stats.businessDayPeriod.start).toLocaleDateString('fr-FR')} -{' '}
            {new Date(stats.businessDayPeriod.end).toLocaleDateString('fr-FR')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default StatsCards;
