import React, { useState, useEffect } from 'react';
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
import { EstablishmentService } from '../../../services/establishmentService';
import { SystemEstablishment } from '../../../types/system';
import { ensureAuthentication } from '../../../services/authHelper';
import { formatDateOnly } from '../../../utils/formatDate';

export const EstablishmentsList: React.FC = () => {
  const [establishments, setEstablishments] = useState<SystemEstablishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEstablishments = async () => {
    try {
      setLoading(true);
      setError(null);
      ensureAuthentication(); // Ensure token is set
      const response = await EstablishmentService.searchEstablishments();
      setEstablishments(response.data.establishments);
    } catch (err) {
      console.error('Error loading establishments:', err);
      setError('Erreur lors du chargement des établissements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEstablishments();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'établissement "${name}" ? Cette action ne peut pas être annulée.`)) {
      return;
    }

    try {
      await EstablishmentService.deleteEstablishment(id);
      await loadEstablishments(); // Refresh the list
    } catch (error) {
      console.error('Error deleting establishment:', error);
      setError('Erreur lors de la suppression de l\'établissement');
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
      case 'pending_setup': return 'info';
      case 'setup_in_progress': return 'warning';
      case 'setup_required': return 'info';
      default: return 'default';
    }
  };

  const getPlanColor = (plan: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (plan) {
      case 'premium': return 'warning';
      case 'enterprise': return 'error';
      default: return 'success';
    }
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
            <TableCell>Type</TableCell>
            <TableCell>Plan</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>Fuseau</TableCell>
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
                  label={establishment.business_type} 
                  color="info"
                  size="small"
                />
              </TableCell>
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
              <TableCell>{establishment.timezone}</TableCell>
              <TableCell>{formatDateOnly(establishment.created_at)}</TableCell>
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