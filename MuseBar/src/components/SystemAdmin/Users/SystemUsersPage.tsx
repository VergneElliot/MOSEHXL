import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { SystemUsersList } from './SystemUsersList';
import { SystemUsersStats } from './SystemUsersStats';
import { CreateSystemUserDialog } from './CreateSystemUserDialog';

const SystemUsersPage: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Gestion des Utilisateurs Système
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Ajouter un Utilisateur
        </Button>
      </Box>

      <SystemUsersStats />
      <SystemUsersList />
      
      <CreateSystemUserDialog 
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </Box>
  );
};

export default SystemUsersPage;