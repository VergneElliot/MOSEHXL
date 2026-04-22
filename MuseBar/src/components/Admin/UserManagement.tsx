/**
 * User Management Component
 * Administrative interface for managing users and permissions
 * 
 * Refactored to use modular hooks for better maintainability
 */

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';

import { EstablishmentAssignableRole } from '../../types/auth';

function formatEstablishmentRoleLabel(role: string): string {
  switch (role) {
    case 'establishment_admin':
      return "Administrateur d'établissement";
    case 'staff':
      return 'Staff';
    default:
      return role;
  }
}

import {
  useUserState,
  useUserActions,
  usePermissions,
  useUserForm,
} from './UserManagement/hooks';

const UserManagement: React.FC<{ token: string }> = ({ token }) => {
  // Initialize hooks
  const userState = useUserState();
  const userForm = useUserForm();
  const permissions = usePermissions();
  
  const userActions = useUserActions({
    onUsersUpdate: userState.updateUsers,
    onUserAdd: userState.addUser,
    onLoading: userState.setLoadingState,
    onError: userState.setErrorState,
  });

  const { fetchUsers } = userActions;

  // Load users only when this tab is active and we have a token (avoids 401 race
  // where /auth/users was called before the token was set after login).
  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token, fetchUsers]);

  /**
   * Handle adding a new user
   */
  const handleAddUser = async () => {
    const validationError = userForm.validateForm();
    if (validationError) {
      userState.setErrorState(validationError);
      return;
    }

    const formData = userForm.getFormData();
    const success = await userActions.createUser(
      formData.email,
      formData.password,
      formData.role
    );

    if (success) {
      userForm.closeAddDialog();
      // Refresh users list
      userActions.fetchUsers();
    }
  };

  /**
   * Handle saving permissions
   */
  const handleSavePermissions = async () => {
    const success = await permissions.savePermissions();
    if (success) {
      // Refresh users list to update any changes
      userActions.fetchUsers();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestion des Utilisateurs
      </Typography>

      {userState.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={userState.clearError}>
          {userState.error}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={userForm.openAddDialog}
        >
          Ajouter un utilisateur
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Rôle</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {userState.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>{formatEstablishmentRoleLabel(user.role)}</TableCell>
                <TableCell>
                  <Button
                    onClick={() => permissions.openPermDialog(user)}
                    variant="outlined"
                    size="small"
                  >
                    Permissions
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add User Dialog */}
      <Dialog open={userForm.showAdd} onClose={userForm.closeAddDialog}>
        <DialogTitle>Ajouter un nouvel utilisateur</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={userForm.newEmail}
            onChange={(e) => userForm.updateEmail(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Mot de passe"
            type="password"
            fullWidth
            variant="outlined"
            value={userForm.newPassword}
            onChange={(e) => userForm.updatePassword(e.target.value)}
          />
          <FormControl fullWidth margin="dense" variant="outlined">
            <InputLabel id="add-user-role-label">Rôle</InputLabel>
            <Select<EstablishmentAssignableRole>
              labelId="add-user-role-label"
              label="Rôle"
              value={userForm.newRole}
              onChange={(e) =>
                userForm.updateRole(e.target.value as EstablishmentAssignableRole)
              }
            >
              <MenuItem value="staff">Staff</MenuItem>
              <MenuItem value="establishment_admin">
                Administrateur d'établissement
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={userForm.closeAddDialog}>Annuler</Button>
          <Button
            onClick={handleAddUser}
            disabled={!userForm.isFormValid()}
            variant="contained"
          >
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog 
        open={permissions.permDialog.open} 
        onClose={permissions.closePermDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Permissions pour {permissions.permDialog.user?.email}
        </DialogTitle>
        <DialogContent>
          {permissions.permError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {permissions.permError}
            </Alert>
          )}
          
          <Box sx={{ mb: 2 }}>
            <Button
              onClick={() => permissions.toggleAllPermissions(true)}
              size="small"
              sx={{ mr: 1 }}
            >
              Tout sélectionner
            </Button>
            <Button
              onClick={() => permissions.toggleAllPermissions(false)}
              size="small"
            >
              Tout désélectionner
            </Button>
          </Box>

          {permissions.availablePermissions.map((perm) => (
            <FormControlLabel
              key={perm.key}
              control={
                <Checkbox
                  checked={permissions.hasPermission(perm.key)}
                  onChange={(e) => permissions.updatePermission(perm.key, e.target.checked)}
                />
              }
              label={perm.label}
              sx={{ display: 'block' }}
            />
          ))}
          
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            {permissions.getEnabledCount()} permission(s) sélectionnée(s)
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={permissions.closePermDialog}>
            Annuler
          </Button>
          <Button
            onClick={handleSavePermissions}
            disabled={permissions.permSaving}
            variant="contained"
          >
            {permissions.permSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;