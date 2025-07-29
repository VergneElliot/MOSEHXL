import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Alert,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Security,
  Lock,
  Archive,
  Timeline,
  Receipt,
  VerifiedUser,
  Gavel
} from '@mui/icons-material';
import { useLegalCompliance, useLegalComplianceUtils } from '../../hooks/useLegalCompliance';

interface ComplianceStatus {
  compliance_status: {
    journal_integrity: string;
    integrity_errors: string[];
    last_closure: string | null;
    certification_required_by: string;
    certification_bodies: string[];
    fine_risk: string;
  };
  journal_statistics: {
    total_entries: number;
    sale_transactions: number;
    first_entry: string | null;
    last_entry: string | null;
  };
  isca_pillars: {
    inaltérabilité: string;
    sécurisation: string;
    conservation: string;
    archivage: string;
  };
  legal_reference: string;
  checked_at: string;
}

interface JournalEntry {
  id: number;
  sequence_number: number;
  transaction_type: string;
  order_id: number | null;
  amount: number;
  vat_amount: number;
  payment_method: string;
  timestamp: string;
  register_id: string;
}

interface ClosureBulletin {
  id: number;
  closure_type: string;
  period_start: string;
  period_end: string;
  total_transactions: number;
  total_amount: number;
  total_vat: number;
  is_closed: boolean;
  closed_at: string | null;
}

const LegalComplianceDashboard: React.FC = () => {
  const [state, actions] = useLegalCompliance();
  const { formatDate, getIntegrityStatusColor } = useLegalComplianceUtils();

  // Business logic is now handled by the custom hook

  const getIntegrityStatusIcon = (status: string) => {
    switch (status) {
      case 'VALID':
        return <CheckCircle />;
      case 'COMPROMISED':
        return <Error />;
      default:
        return <Warning />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (state.loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <AlertTitle>Erreur</AlertTitle>
        {error}
      </Alert>
    );
  }

  if (!complianceStatus) {
    return (
      <Alert severity="warning">
        <AlertTitle>Aucune donnée</AlertTitle>
        Impossible de charger les données de conformité
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Gavel />
        Conformité Légale Française
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Article 286-I-3 bis du CGI - Système de caisse sécurisé
      </Typography>

      {/* Compliance Status Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security />
                Statut de Conformité
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip
                  icon={getIntegrityStatusIcon(complianceStatus.compliance_status.journal_integrity)}
                  label={`Intégrité: ${complianceStatus.compliance_status.journal_integrity}`}
                  color={getIntegrityStatusColor(complianceStatus.compliance_status.journal_integrity) as any}
                  variant="outlined"
                />
              </Box>

              <Alert severity="warning" sx={{ mb: 2 }}>
                <AlertTitle>Certification Requise</AlertTitle>
                Certification obligatoire avant le {complianceStatus.compliance_status.certification_required_by}
                <br />
                <strong>Risque d'amende:</strong> {complianceStatus.compliance_status.fine_risk}
              </Alert>

              <Typography variant="body2" color="text.secondary">
                <strong>Organismes de certification:</strong>
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {complianceStatus.compliance_status.certification_bodies.map((body, index) => (
                  <Chip key={index} label={body} size="small" variant="outlined" />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timeline />
                Statistiques du Journal
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="h4" color="primary">
                    {complianceStatus.journal_statistics.total_entries}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Entrées totales
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h4" color="success.main">
                    {complianceStatus.journal_statistics.sale_transactions}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Transactions de vente
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary">
                <strong>Première entrée:</strong> {complianceStatus.journal_statistics.first_entry ? formatDate(complianceStatus.journal_statistics.first_entry) : 'Aucune'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Dernière entrée:</strong> {complianceStatus.journal_statistics.last_entry ? formatDate(complianceStatus.journal_statistics.last_entry) : 'Aucune'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ISCA Pillars */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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

      {/* Actions */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item>
          <Button
            variant="outlined"
            startIcon={<Timeline />}
            onClick={() => setShowJournalDialog(true)}
          >
            Voir Journal Légal ({journalEntries.length} entrées)
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            startIcon={<Receipt />}
            onClick={() => setShowClosuresDialog(true)}
          >
            Bulletins de Clôture ({closureBulletins.length})
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            onClick={loadComplianceData}
          >
            Actualiser
          </Button>
        </Grid>
      </Grid>

      {/* Integrity Errors */}
      {complianceStatus.compliance_status.integrity_errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Erreurs d'Intégrité Détectées</AlertTitle>
          <List dense>
            {complianceStatus.compliance_status.integrity_errors.map((error, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <Error color="error" />
                </ListItemIcon>
                <ListItemText primary={error} />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {/* Journal Entries Dialog */}
      <Dialog
        open={showJournalDialog}
        onClose={() => setShowJournalDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Journal Légal - Entrées Récentes
          <Typography variant="body2" color="text.secondary">
            Journal immuable conforme à l'article 286-I-3 bis du CGI
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>N° Séquence</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Commande</TableCell>
                  <TableCell>Montant</TableCell>
                  <TableCell>TVA</TableCell>
                  <TableCell>Paiement</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {journalEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Aucune entrée dans le journal
                    </TableCell>
                  </TableRow>
                ) : (
                  journalEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.sequence_number}</TableCell>
                      <TableCell>
                        <Chip 
                          label={entry.transaction_type} 
                          size="small"
                          color={entry.transaction_type === 'SALE' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{entry.order_id || '-'}</TableCell>
                      <TableCell>{formatCurrency(entry.amount)}</TableCell>
                      <TableCell>{formatCurrency(entry.vat_amount)}</TableCell>
                      <TableCell>{entry.payment_method}</TableCell>
                      <TableCell>{formatDate(entry.timestamp)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowJournalDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Closure Bulletins Dialog */}
      <Dialog
        open={showClosuresDialog}
        onClose={() => setShowClosuresDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Bulletins de Clôture
          <Typography variant="body2" color="text.secondary">
            Consolidation périodique des données fiscales
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Période</TableCell>
                  <TableCell>Transactions</TableCell>
                  <TableCell>Montant Total</TableCell>
                  <TableCell>TVA Total</TableCell>
                  <TableCell>Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {closureBulletins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Aucun bulletin de clôture
                    </TableCell>
                  </TableRow>
                ) : (
                  closureBulletins.map((bulletin) => (
                    <TableRow key={bulletin.id}>
                      <TableCell>{bulletin.closure_type}</TableCell>
                      <TableCell>
                        {formatDate(bulletin.period_start)} - {formatDate(bulletin.period_end)}
                      </TableCell>
                      <TableCell>{bulletin.total_transactions}</TableCell>
                      <TableCell>{formatCurrency(bulletin.total_amount)}</TableCell>
                      <TableCell>{formatCurrency(bulletin.total_vat)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={bulletin.is_closed ? 'Clôturé' : 'En cours'} 
                          size="small"
                          color={bulletin.is_closed ? 'success' : 'warning'}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowClosuresDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Footer */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          <strong>Référence légale:</strong> {complianceStatus.legal_reference} | 
          <strong>Dernière vérification:</strong> {formatDate(complianceStatus.checked_at)}
        </Typography>
      </Box>
    </Box>
  );
};

export default LegalComplianceDashboard; 