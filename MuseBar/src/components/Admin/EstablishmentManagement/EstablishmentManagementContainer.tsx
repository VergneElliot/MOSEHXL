/**
 * Establishment Management Container
 * Main container component that orchestrates all establishment management functionality
 */

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useEstablishmentManagement } from './useEstablishmentManagement';
import EstablishmentStats from './EstablishmentStats';
import EstablishmentTable from './EstablishmentTable';
import CreateEstablishmentDialog from './CreateEstablishmentDialog';
import InviteEstablishmentDialog from './InviteEstablishmentDialog';

interface EstablishmentManagementContainerProps {
  token: string;
}

const EstablishmentManagementContainer: React.FC<EstablishmentManagementContainerProps> = ({ token }) => {
  const {
    // State
    establishments,
    loading,
    error,
    snackbar,
    
    // Dialog states
    showCreateDialog,
    showInviteDialog,
    
    // Form data
    createForm,
    inviteForm,
    
    // Actions
    handleCreateEstablishment,
    handleSendInvitation,
    handleDeleteEstablishment,
    
    // Dialog controls
    setShowCreateDialog,
    setShowInviteDialog,
    
    // Form controls
    setCreateForm,
    setInviteForm,
    
    // Snackbar controls
    closeSnackbar
  } = useEstablishmentManagement(token);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" gutterBottom>
          Establishment Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<EmailIcon />}
            onClick={() => setShowInviteDialog(true)}
            sx={{ mr: 2 }}
          >
            Send Invitation
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
          >
            Create Establishment
          </Button>
        </Box>
      </Box>

      {/* Error Display */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Statistics Cards */}
      <EstablishmentStats establishments={establishments} />

      {/* Establishments Table */}
      <EstablishmentTable
        establishments={establishments}
        onDelete={(establishment) => handleDeleteEstablishment(establishment.id)}
      />

      {/* Create Establishment Dialog */}
      <CreateEstablishmentDialog
        open={showCreateDialog}
        formData={createForm}
        onClose={() => setShowCreateDialog(false)}
        onChange={setCreateForm}
        onSubmit={handleCreateEstablishment}
      />

      {/* Send Invitation Dialog */}
      <InviteEstablishmentDialog
        open={showInviteDialog}
        formData={inviteForm}
        onClose={() => setShowInviteDialog(false)}
        onChange={setInviteForm}
        onSubmit={handleSendInvitation}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EstablishmentManagementContainer;
export { EstablishmentManagementContainer };
