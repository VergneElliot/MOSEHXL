/**
 * Compliance Overview Component
 * Displays overview cards and status information
 */

import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Alert,
  AlertTitle,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Security,
  Timeline,
  Receipt,
  VerifiedUser,
  Lock,
  Archive,
  Visibility,
} from '@mui/icons-material';
import { ComplianceOverviewProps } from './types';

/**
 * Compliance Overview Component
 */
export const ComplianceOverview: React.FC<ComplianceOverviewProps> = ({
  complianceStatus,
  onViewJournal,
  onViewClosures,
  loading = false,
}) => {
  const getIntegrityStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'valide':
      case 'valid':
        return <Security color="success" />;
      case 'erreur':
      case 'error':
        return <Security color="error" />;
      case 'avertissement':
      case 'warning':
        return <Security color="warning" />;
      default:
        return <Security color="action" />;
    }
  };

  const getIntegrityStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'valide':
      case 'valid':
        return 'success';
      case 'erreur':
      case 'error':
        return 'error';
      case 'avertissement':
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: string): string => {
    if (!date) return 'N/A';
    
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Date invalide';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {/* Compliance Status */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Security />
              Statut de Conformité
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Chip
                icon={getIntegrityStatusIcon(
                  complianceStatus.compliance_status.journal_integrity
                )}
                label={`Intégrité: ${complianceStatus.compliance_status.journal_integrity}`}
                color={
                  getIntegrityStatusColor(
                    complianceStatus.compliance_status.journal_integrity
                  ) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
                }
                variant="outlined"
              />
            </Box>

            {!complianceStatus.compliance_status.is_certified && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <AlertTitle>Certification Requise</AlertTitle>
                Certification obligatoire avant le{' '}
                {complianceStatus.compliance_status.certification_required_by}
                <br />
                Contactez votre prestataire pour la certification NF 525.
              </Alert>
            )}

            {complianceStatus.compliance_status.is_certified && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <AlertTitle>Système Certifié</AlertTitle>
                Votre système de caisse est conforme NF 525 et certifié pour la loi anti-fraude.
              </Alert>
            )}

            <Button
              variant="outlined"
              startIcon={<Visibility />}
              onClick={onViewJournal}
              sx={{ mr: 1 }}
            >
              Voir le Journal
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<Archive />}
              onClick={onViewClosures}
            >
              Clôtures
            </Button>
          </CardContent>
        </Card>
      </Grid>

      {/* Journal Statistics */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Timeline />
              Statistiques du Journal
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="h4" color="primary" sx={{ mb: 1 }}>
                {complianceStatus.journal_statistics.total_entries.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Entrées totales dans le journal légal
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" color="secondary" sx={{ mb: 1 }}>
                {complianceStatus.journal_statistics.total_transactions.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Transactions enregistrées
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              <strong>Première entrée:</strong>{' '}
              {complianceStatus.journal_statistics.first_entry
                ? formatDate(complianceStatus.journal_statistics.first_entry)
                : 'Aucune'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Dernière entrée:</strong>{' '}
              {complianceStatus.journal_statistics.last_entry
                ? formatDate(complianceStatus.journal_statistics.last_entry)
                : 'Aucune'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* ISCA Pillars */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <VerifiedUser />
              Piliers ISCA
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Lock color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">Inaltérabilité</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {complianceStatus.isca_pillars.inaltérabilité}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Security color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">Sécurisation</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {complianceStatus.isca_pillars.sécurisation}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Receipt color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">Conservation</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {complianceStatus.isca_pillars.conservation}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Archive color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">Archivage</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {complianceStatus.isca_pillars.archivage}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default ComplianceOverview;

