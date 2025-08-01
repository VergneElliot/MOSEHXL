import React from 'react';
import { Box, Typography, Button, Grid } from '@mui/material';
import { Add as AddIcon, Email as EmailIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        Actions Rapides
      </Typography>
      <Grid container spacing={2}>
        <Grid item>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/system/establishments/create')}
          >
            Créer un Établissement
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            startIcon={<EmailIcon />}
            onClick={() => navigate('/system/invitations')}
          >
            Invitations en Cours
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};