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
  Box
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { SystemUser } from '../../../types/system';

export const SystemUsersList: React.FC = () => {
  // TODO: Replace with actual data from hook
  const users: SystemUser[] = [
    {
      id: 3,
      email: 'elliot.vergne@gmail.com',
      first_name: 'Elliot',
      last_name: 'Vergne',
      role: 'system_admin',
      is_active: true,
      last_login: '2025-08-01T10:00:00Z',
      created_at: '2025-07-31T20:30:05Z'
    }
  ]; // Mock data

  const getRoleColor = (role: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    return role === 'system_admin' ? 'error' : 'primary';
  };

  const getStatusColor = (isActive: boolean): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    return isActive ? 'success' : 'default';
  };

  const getRoleLabel = (role: string) => {
    return role === 'system_admin' ? 'Administrateur' : 'Opérateur';
  };

  if (users.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="textSecondary">
          Aucun utilisateur système
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Cliquez sur "Ajouter un Utilisateur" pour commencer
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Utilisateur</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Rôle</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>Dernière Connexion</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <Box>
                  <Typography variant="subtitle2">
                    {user.first_name} {user.last_name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ID: {user.id}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Chip 
                  label={getRoleLabel(user.role)} 
                  color={getRoleColor(user.role)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip 
                  label={user.is_active ? 'Actif' : 'Inactif'} 
                  color={getStatusColor(user.is_active)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {user.last_login ? new Date(user.last_login).toLocaleDateString('fr-FR') : 'Jamais'}
              </TableCell>
              <TableCell>
                <IconButton size="small" title="Permissions">
                  <SecurityIcon />
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