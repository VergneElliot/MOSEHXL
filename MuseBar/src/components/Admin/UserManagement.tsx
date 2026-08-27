/**
 * User Management Component
 * Administrative interface for managing users and permissions
 *
 * Refactored to use modular hooks for better maintainability
 */

import React, { useCallback, useEffect, useState } from 'react';
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
  Chip,
} from '@mui/material';

import { EstablishmentAssignableRole } from '../../types/auth';
import {
  useUserState,
  useUserActions,
  usePermissions,
  useUserForm,
} from './UserManagement/hooks';
import * as floorApi from '../../services/api/floor';

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

const UserManagement: React.FC<{ token: string }> = ({ token }) => {
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
  const [pinStatusByUser, setPinStatusByUser] = useState<Record<number, boolean>>({});
  const [pinDialog, setPinDialog] = useState<{ userId: number; email: string } | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const refreshPinStatuses = useCallback(async (users: Array<{ id: number }>) => {
    const entries = await Promise.all(
      users.map(async (u) => {
        try {
          const status = await floorApi.getPinStatus(u.id);
          return [u.id, status.has_pin] as const;
        } catch {
          return [u.id, false] as const;
        }
      })
    );
    setPinStatusByUser(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token, fetchUsers]);

  useEffect(() => {
    if (userState.users.length > 0) {
      void refreshPinStatuses(userState.users);
    }
  }, [userState.users, refreshPinStatuses]);

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
      userActions.fetchUsers();
    }
  };

  const handleSavePermissions = async () => {
    const success = await permissions.savePermissions();
    if (success) {
      userActions.fetchUsers();
    }
  };

  const handleDeleteUser = async (user: (typeof userState.users)[number]) => {
    const confirmed = window.confirm(
      `Supprimer définitivement le compte ${user.email} ?`
    );
    if (!confirmed) return;

    const success = await userActions.deleteUser(user.id);
    if (success) {
      userActions.fetchUsers();
    }
  };

  const handleSavePin = async () => {
    if (!pinDialog) return;
    setPinBusy(true);
    setPinError(null);
    try {
      await floorApi.setPin(pinValue, pinDialog.userId);
      setPinDialog(null);
      setPinValue('');
      await refreshPinStatuses(userState.users);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setPinError(e.message || 'Impossible d’enregistrer le PIN');
    } finally {
      setPinBusy(false);
    }
  };

  const handleClearPin = async (user: (typeof userState.users)[number]) => {
    if (!window.confirm(`Effacer le PIN badge de ${user.email} ?`)) return;
    try {
      await floorApi.clearPin(user.id);
      await refreshPinStatuses(userState.users);
    } catch (err: unknown) {
      const e = err as { message?: string };
      userState.setErrorState(e.message || 'Impossible d’effacer le PIN');
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
        <Button variant="contained" color="primary" onClick={userForm.openAddDialog}>
          Ajouter un utilisateur
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Rôle</TableCell>
              <TableCell>PIN badge</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {userState.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>{formatEstablishmentRoleLabel(user.role)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={pinStatusByUser[user.id] ? 'PIN défini' : 'Pas de PIN'}
                    color={pinStatusByUser[user.id] ? 'success' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    onClick={() => permissions.openPermDialog(user)}
                    variant="outlined"
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    Permissions
                  </Button>
                  <Button
                    onClick={() => {
                      setPinError(null);
                      setPinValue('');
                      setPinDialog({ userId: user.id, email: user.email });
                    }}
                    variant="outlined"
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    {pinStatusByUser[user.id] ? 'Changer PIN' : 'Définir PIN'}
                  </Button>
                  {pinStatusByUser[user.id] && (
                    <Button
                      onClick={() => void handleClearPin(user)}
                      variant="outlined"
                      color="warning"
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      Effacer PIN
                    </Button>
                  )}
                  <Button
                    onClick={() => handleDeleteUser(user)}
                    variant="outlined"
                    color="error"
                    size="small"
                  >
                    Supprimer
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
                Administrateur d&apos;établissement
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

      <Dialog open={pinDialog != null} onClose={() => setPinDialog(null)}>
        <DialogTitle>PIN badge — {pinDialog?.email}</DialogTitle>
        <DialogContent>
          {pinError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {pinError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="PIN (6 chiffres)"
            type="password"
            inputMode="numeric"
            fullWidth
            value={pinValue}
            onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
            helperText="Le serveur refuse un PIN déjà utilisé par un autre membre."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPinDialog(null)}>Annuler</Button>
          <Button
            variant="contained"
            disabled={pinBusy || pinValue.length !== 6}
            onClick={() => void handleSavePin()}
          >
            {pinBusy ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={permissions.permDialog.open}
        onClose={permissions.closePermDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Permissions pour {permissions.permDialog.user?.email}</DialogTitle>
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
            <Button onClick={() => permissions.toggleAllPermissions(false)} size="small">
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
          <Button onClick={permissions.closePermDialog}>Annuler</Button>
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
