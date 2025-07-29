import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography
} from '@mui/material';
import {
  Visibility,
  Print,
  Download
} from '@mui/icons-material';
import { ClosureBulletin } from '../../hooks/useClosureState';

interface BulletinsTableProps {
  bulletins: ClosureBulletin[];
  loading: boolean;
  onViewDetails: (bulletin: ClosureBulletin) => void;
  onPrint: (bulletin: ClosureBulletin) => void;
  onDownload: (bulletin: ClosureBulletin) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getClosureTypeLabel: (type: string) => string;
}

const BulletinsTable: React.FC<BulletinsTableProps> = ({
  bulletins,
  loading,
  onViewDetails,
  onPrint,
  onDownload,
  formatCurrency,
  formatDate,
  getClosureTypeLabel
}) => {
  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Chargement des bulletins...</Typography>
      </Box>
    );
  }

  if (bulletins.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="textSecondary">
          Aucun bulletin de clôture trouvé
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Type</TableCell>
            <TableCell>Période</TableCell>
            <TableCell align="right">Transactions</TableCell>
            <TableCell align="right">Montant Total</TableCell>
            <TableCell align="center">Statut</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {bulletins.map((bulletin) => (
            <TableRow key={bulletin.id} hover>
              <TableCell>
                <Chip 
                  label={getClosureTypeLabel(bulletin.closure_type)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatDate(bulletin.period_start)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  au {formatDate(bulletin.period_end)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                {bulletin.total_transactions}
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight="medium">
                  {formatCurrency(bulletin.total_amount)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={bulletin.is_closed ? 'Clôturé' : 'En cours'}
                  size="small"
                  color={bulletin.is_closed ? 'success' : 'warning'}
                />
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Tooltip title="Voir les détails">
                    <IconButton 
                      size="small" 
                      onClick={() => onViewDetails(bulletin)}
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Imprimer">
                    <IconButton 
                      size="small" 
                      onClick={() => onPrint(bulletin)}
                    >
                      <Print />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Télécharger">
                    <IconButton 
                      size="small" 
                      onClick={() => onDownload(bulletin)}
                    >
                      <Download />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default BulletinsTable; 