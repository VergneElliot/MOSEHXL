import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { EstablishmentsList } from './EstablishmentsList';
import { EstablishmentStats } from './EstablishmentStats';
import { CreateEstablishmentDialog } from './CreateEstablishmentDialog';

const EstablishmentsPage: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-open dialog if on create route
  useEffect(() => {
    if (location.pathname.includes('/create')) {
      setCreateDialogOpen(true);
    }
  }, [location.pathname]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Gestion des Établissements
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Créer un Établissement
        </Button>
      </Box>

      <EstablishmentStats />
      <EstablishmentsList />
      
      <CreateEstablishmentDialog 
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          // Navigate back to establishments list if we were on create route
          if (location.pathname.includes('/create')) {
            navigate('/system/establishments');
          }
        }}
      />
    </Box>
  );
};

export default EstablishmentsPage;