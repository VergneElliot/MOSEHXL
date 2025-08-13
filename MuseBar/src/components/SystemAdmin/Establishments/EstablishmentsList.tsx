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
  const { establishments, loading, error, deleteEstablishment } = useEstablishments();

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'établissement "${name}" ? Cette action ne peut pas être annulée.`)) {
      return;
    }

    try {
      await deleteEstablishment(id);
      // The establishments list will be automatically refreshed by the hook
    } catch (error) {
      console.error('Error deleting establishment:', error);
      // You might want to show a toast notification here
    }
  };

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

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'error';
      case 'pending': return 'warning';
      case 'setup_required': return 'info';
      default: return 'default';
    }
  };

  const getPlanColor = (plan: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
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
                  color={getPlanColor(establishment.subscription_plan)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip 
                  label={establishment.status} 
                  color={getStatusColor(establishment.status)}
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
                <IconButton 
                  size="small" 
                  title="Supprimer"
                  onClick={() => handleDelete(establishment.id, establishment.name)}
                  color="error"
                >
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