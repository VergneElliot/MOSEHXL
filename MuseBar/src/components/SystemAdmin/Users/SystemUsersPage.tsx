import React, { useState } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { SystemUsersList } from './SystemUsersList';
import { SystemUsersStats } from './SystemUsersStats';
import { CreateSystemUserDialog } from './CreateSystemUserDialog';
import { useSystemUsers } from '../../../hooks/useSystemUsers';
import type { SystemUser } from '../../../types/system';

const SystemUsersPage: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { users, loading, error, createUser, setActive } = useSystemUsers();

  const handleToggleActive = async (user: SystemUser) => {
    const next = !user.is_active;
    const verb = next ? 'réactiver' : 'désactiver';
    if (!window.confirm(`Voulez-vous vraiment ${verb} ${user.email} ?`)) return;
    try {
      await setActive(user.id, next);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : `Impossible de ${verb} l'utilisateur`);
    }
  };

  return (
    <Box sx={{ px: 3, pb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Gestion des Utilisateurs Système</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Ajouter un Utilisateur
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <SystemUsersStats users={users} />
      <SystemUsersList users={users} loading={loading} onToggleActive={handleToggleActive} />

      <CreateSystemUserDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={createUser}
      />
    </Box>
  );
};

export default SystemUsersPage;
