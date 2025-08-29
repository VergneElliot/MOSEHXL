/**
 * Compliance Reports Component
 * Handles report generation and data display dialogs
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
} from '@mui/material';
import { ComplianceReportsProps } from './types';

/**
 * Compliance Reports Component
 */
export const ComplianceReports: React.FC<ComplianceReportsProps> = ({
  journalEntries,
  closureBulletins,
  showJournalDialog,
  showClosuresDialog,
  onCloseJournalDialog,
  onCloseClosuresDialog,
  loading = false,
}) => {
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

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <>
      {/* Journal Entries Dialog */}
      <Dialog
        open={showJournalDialog}
        onClose={onCloseJournalDialog}
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
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Total des entrées:</strong> {journalEntries.length.toLocaleString()}
            </Typography>
          </Box>
          
          <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell><strong>N° Séquence</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Commande</strong></TableCell>
                  <TableCell><strong>Montant</strong></TableCell>
                  <TableCell><strong>TVA</strong></TableCell>
                  <TableCell><strong>Paiement</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Hash</strong></TableCell>
                </TableRow>
              </TableHead>
              
              <TableBody>
                {journalEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Aucune entrée dans le journal
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  journalEntries.map((entry) => (
                    <TableRow key={entry.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {entry.sequence_number}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Chip 
                          label={entry.entry_type} 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {entry.order_id}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(entry.total_amount)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {formatCurrency(entry.total_vat)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Chip 
                          label={entry.payment_method} 
                          size="small" 
                          color="secondary" 
                          variant="outlined" 
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(entry.created_at)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace', 
                            fontSize: '0.75rem',
                            maxWidth: 100,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={entry.hash}
                        >
                          {entry.hash.substring(0, 12)}...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onCloseJournalDialog}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Closure Bulletins Dialog */}
      <Dialog
        open={showClosuresDialog}
        onClose={onCloseClosuresDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Bulletins de Clôture
          <Typography variant="body2" color="text.secondary">
            Clôtures périodiques pour conformité fiscale
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Total des bulletins:</strong> {closureBulletins.length.toLocaleString()}
            </Typography>
          </Box>
          
          <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Période</strong></TableCell>
                  <TableCell><strong>Transactions</strong></TableCell>
                  <TableCell><strong>Montant Total</strong></TableCell>
                  <TableCell><strong>TVA Total</strong></TableCell>
                  <TableCell><strong>Statut</strong></TableCell>
                  <TableCell><strong>Date Création</strong></TableCell>
                </TableRow>
              </TableHead>
              
              <TableBody>
                {closureBulletins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Aucun bulletin de clôture
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  closureBulletins.map((bulletin) => (
                    <TableRow key={bulletin.id} hover>
                      <TableCell>
                        <Chip 
                          label={bulletin.closure_type} 
                          size="small" 
                          color="primary" 
                          variant="filled" 
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {bulletin.period_start ? formatDate(bulletin.period_start) : 'N/A'} 
                          {' - '}
                          {bulletin.period_end ? formatDate(bulletin.period_end) : 'N/A'}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {bulletin.total_transactions.toLocaleString()}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(bulletin.total_amount)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {formatCurrency(bulletin.total_vat || 0)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={bulletin.is_closed ? 'Clôturé' : 'En cours'}
                          size="small"
                          color={bulletin.is_closed ? 'success' : 'warning'}
                          variant={bulletin.is_closed ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(bulletin.created_at)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onCloseClosuresDialog}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ComplianceReports;

