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
  CircularProgress,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Restore as RestoreIcon,
} from '@mui/icons-material';
import { SystemUser } from '../../../types/system';
import { formatDateOnly } from '../../../utils/formatDate';

interface SystemUsersListProps {
  users: SystemUser[];
  loading?: boolean;
  onToggleActive: (user: SystemUser) => void;
}

export const SystemUsersList: React.FC<SystemUsersListProps> = ({
  users,
  loading = false,
  onToggleActive,
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (users.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          Aucun utilisateur système trouvé
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
            <TableCell>Rôle</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell>Dernière connexion</TableCell>
            <TableCell>Créé le</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                {[user.first_name, user.last_name].filter(Boolean).join(' ') || '—'}
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Chip label="Administrateur" color="error" size="small" />
              </TableCell>
              <TableCell>
                <Chip
                  label={user.is_active ? 'Actif' : 'Inactif'}
                  color={user.is_active ? 'success' : 'default'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {user.last_login ? formatDateOnly(user.last_login) : 'Jamais'}
              </TableCell>
              <TableCell>{formatDateOnly(user.created_at)}</TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  color={user.is_active ? 'error' : 'primary'}
                  onClick={() => onToggleActive(user)}
                  aria-label={user.is_active ? 'Désactiver' : 'Réactiver'}
                >
                  {user.is_active ? <DeleteIcon /> : <RestoreIcon />}
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
