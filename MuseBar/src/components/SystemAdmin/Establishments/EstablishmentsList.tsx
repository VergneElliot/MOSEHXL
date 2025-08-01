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
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useEstablishments } from '../../../hooks/useEstablishments';

export const EstablishmentsList: React.FC = () => {
  const { establishments, loading, error } = useEstablishments();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'error';
      case 'pending': return 'warning';
      case 'setup_required': return 'info';
      default: return 'default';
    }
  };

  const getPlanColor = (plan: string) => {
    return plan === 'premium' ? 'warning' : 'success';
  };

  if (establishments.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="textSecondary">
          Aucun établissement créé
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Cliquez sur "Créer un Établissement" pour commencer
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nom</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Plan</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>Créé le</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {establishments.map((establishment) => (
            <TableRow key={establishment.id}>
              <TableCell>
                <Box>
                  <Typography variant="subtitle2">{establishment.name}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {establishment.phone}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>{establishment.email}</TableCell>
              <TableCell>
                <Chip 
                  label={establishment.subscription_plan} 
                  color={getPlanColor(establishment.subscription_plan) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip 
                  label={establishment.status} 
                  color={getStatusColor(establishment.status) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>{new Date(establishment.created_at).toLocaleDateString('fr-FR')}</TableCell>
              <TableCell>
                <IconButton size="small" title="Voir">
                  <ViewIcon />
                </IconButton>
                <IconButton size="small" title="Modifier">
                  <EditIcon />
                </IconButton>
                <IconButton size="small" title="Supprimer">
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};