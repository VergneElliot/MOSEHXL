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
  FormControl,
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
import ActivePinSessionsPanel from './UserManagement/ActivePinSessionsPanel';
import PermissionsDialog from './UserManagement/PermissionsDialog';
import UserRowActions from './UserManagement/UserRowActions';

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
  const [pinStatusByUser, setPinStatusByUser] = useState<
    Record<number, { has_pin: boolean; kind: 'basic' | 'elevated'; min: number; max: number }>
  >({});
  const [pinDialog, setPinDialog] = useState<{
    userId: number;
    email: string;
    kind: 'basic' | 'elevated';
    min: number;
    max: number;
  } | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const refreshPinStatuses = useCallback(async (users: Array<{ id: number }>) => {
    const entries = await Promise.all(
      users.map(async (u) => {
        try {
          const status = await floorApi.getPinStatus(u.id);
          return [
            u.id,
            {
              has_pin: status.has_pin,
              kind: status.pin_kind ?? 'basic',
              min: status.min_length ?? 2,
              max: status.max_length ?? 2,
            },
          ] as const;
        } catch {
          return [u.id, { has_pin: false, kind: 'basic' as const, min: 2, max: 2 }] as const;
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

  const openPinDialog = (user: (typeof userState.users)[number]) => {
    const status = pinStatusByUser[user.id];
    setPinError(null);
    setPinValue('');
    setPinDialog({
      userId: user.id,
      email: user.email,
      kind: status?.kind ?? 'basic',
      min: status?.min ?? 2,
      max: status?.max ?? 2,
    });
  };

  const handleDeactivateUser = async (user: (typeof userState.users)[number]) => {
    const confirmed = window.confirm(
      `Désactiver le compte ${user.email} ? Son PIN est effacé et ses sessions sont fermées. ` +
        'Le compte est conservé pour la traçabilité de ses actions passées.'
    );
    if (!confirmed) return;
    if (await userActions.deactivateUser(user.id)) userActions.fetchUsers();
  };

  const handleReactivateUser = async (user: (typeof userState.users)[number]) => {
    if (await userActions.reactivateUser(user.id)) userActions.fetchUsers();
  };

  const handlePurgeUser = async (user: (typeof userState.users)[number]) => {
    const confirmed = window.confirm(
      `Supprimer définitivement ${user.email} ? Irréversible, et refusé si le compte a la ` +
        'moindre activité enregistrée.'
    );
    if (!confirmed) return;
    if (await userActions.purgeUser(user.id)) userActions.fetchUsers();
  };

  const handleSavePin = async () => {
    if (!pinDialog) return;
    if (pinValue.length < pinDialog.min || pinValue.length > pinDialog.max) {
      setPinError(
        pinDialog.kind === 'basic'
          ? 'Le PIN doit contenir exactement 2 chiffres'
          : `Le PIN doit contenir entre ${pinDialog.min} et ${pinDialog.max} chiffres`
      );
      return;
    }
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
              <TableRow key={user.id} sx={user.isActive === false ? { opacity: 0.6 } : undefined}>
                <TableCell>
                  {user.email}
                  {user.isActive === false && (
                    <Chip size="small" label="Désactivé" sx={{ ml: 1 }} />
                  )}
                </TableCell>
                <TableCell>{formatEstablishmentRoleLabel(user.role)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={
                      pinStatusByUser[user.id]?.has_pin
                        ? `PIN défini (${pinStatusByUser[user.id]?.kind === 'elevated' ? '4–8' : '2'})`
                        : 'Pas de PIN'
                    }
                    color={pinStatusByUser[user.id]?.has_pin ? 'success' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <UserRowActions
                    isActive={user.isActive !== false}
                    hasPin={pinStatusByUser[user.id]?.has_pin === true}
                    onPermissions={() => permissions.openPermDialog(user)}
                    onSetPin={() => openPinDialog(user)}
                    onClearPin={() => void handleClearPin(user)}
                    onDeactivate={() => void handleDeactivateUser(user)}
                    onReactivate={() => void handleReactivateUser(user)}
                    onPurge={() => void handlePurgeUser(user)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ActivePinSessionsPanel />

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
            label={
              pinDialog?.kind === 'elevated'
                ? `PIN (${pinDialog.min}–${pinDialog.max} chiffres)`
                : 'PIN (2 chiffres)'
            }
            type="password"
            inputMode="numeric"
            fullWidth
            value={pinValue}
            onChange={(e) =>
              setPinValue(
                e.target.value.replace(/\D/g, '').slice(0, pinDialog?.max ?? 8)
              )
            }
            helperText={
              pinDialog?.kind === 'elevated'
                ? 'Permissions élevées : 4 à 8 chiffres, unique dans l’établissement.'
                : 'Personnel de base : exactement 2 chiffres, unique dans l’établissement.'
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPinDialog(null)}>Annuler</Button>
          <Button
            variant="contained"
            disabled={
              pinBusy ||
              !pinDialog ||
              pinValue.length < pinDialog.min ||
              pinValue.length > pinDialog.max
            }
            onClick={() => void handleSavePin()}
          >
            {pinBusy ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      <PermissionsDialog
        open={permissions.permDialog.open}
        userEmail={permissions.permDialog.user?.email}
        error={permissions.permError}
        saving={permissions.permSaving}
        availablePermissions={permissions.availablePermissions}
        enabledCount={permissions.getEnabledCount()}
        hasPermission={permissions.hasPermission}
        onTogglePermission={permissions.updatePermission}
        onToggleAll={permissions.toggleAllPermissions}
        onClose={permissions.closePermDialog}
        onSave={handleSavePermissions}
      />
    </Box>
  );
};

export default UserManagement;
