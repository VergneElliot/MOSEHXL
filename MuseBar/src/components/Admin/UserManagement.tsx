import React, { useEffect, useState } from 'react';
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
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import { apiService } from '../../services/apiService';

const PERMISSIONS = [
  { key: 'access_pos', label: 'Caisse' },
  { key: 'access_menu', label: 'Gestion Menu' },
  { key: 'access_happy_hour', label: 'Happy Hour' },
  { key: 'access_history', label: 'Historique' },
  { key: 'access_settings', label: 'Paramètres' },
  { key: 'access_compliance', label: 'Conformité' },
];

const UserManagement: React.FC<{ token: string }> = ({ token }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Already imported as singleton instance
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [permDialog, setPermDialog] = useState<{ open: boolean; user: any | null }>({
    open: false,
    user: null,
  });
  const [permState, setPermState] = useState<{ [key: string]: boolean }>({});
  const [permSaving, setPermSaving] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get<any[]>('/auth/users');
      setUsers(response.data);
    } catch (e) {
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAddUser = async () => {
    try {
      await apiService.post<any>('/auth/register', {
        email: newEmail,
        password: newPassword,
        is_admin: newIsAdmin,
      });
      setShowAdd(false);
      setNewEmail('');
      setNewPassword('');
      setNewIsAdmin(false);
      fetchUsers();
    } catch {
      setError('Erreur lors de la création de l’utilisateur');
    }
  };

  const openPermDialog = async (user: any) => {
    setPermDialog({ open: true, user });
    setPermError(null);
    setPermSaving(false);
    // Fetch permissions
    const response = await apiService.get<any>(`/auth/users/${user.id}/permissions`);
    const data = response.data;
    const state: { [key: string]: boolean } = {};
    PERMISSIONS.forEach(p => {
      state[p.key] = data.permissions.includes(p.key);
    });
    setPermState(state);
  };

  const handleSavePerms = async () => {
    setPermSaving(true);
    setPermError(null);
    const userId = permDialog.user.id;
    const perms = Object.keys(permState).filter(k => permState[k]);
    try {
      await apiService.post<any>(`/auth/users/${userId}/permissions`, { permissions: perms });
      setPermDialog({ open: false, user: null });
      fetchUsers();
    } catch {
      setPermError('Erreur lors de la sauvegarde des permissions');
    } finally {
      setPermSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Gestion des utilisateurs
      </Typography>
      <Button variant="contained" onClick={() => setShowAdd(true)} sx={{ mb: 2 }}>
        Ajouter un utilisateur
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User ID</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Admin</TableCell>
              <TableCell>Créé le</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.is_admin ? 'Oui' : 'Non'}</TableCell>
                <TableCell>{new Date(user.created_at).toLocaleString('fr-FR')}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => openPermDialog(user)}>
                    Permissions
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add user dialog */}
      <Dialog open={showAdd} onClose={() => setShowAdd(false)}>
        <DialogTitle>Ajouter un utilisateur</DialogTitle>
        <DialogContent>
          <TextField
            label="Email"
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Mot de passe"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            fullWidth
            margin="normal"
          />
          <FormControlLabel
            control={
              <Checkbox checked={newIsAdmin} onChange={e => setNewIsAdmin(e.target.checked)} />
            }
            label="Admin"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAdd(false)}>Annuler</Button>
          <Button onClick={handleAddUser} variant="contained">
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permissions dialog */}
      <Dialog open={permDialog.open} onClose={() => setPermDialog({ open: false, user: null })}>
        <DialogTitle>Permissions de {permDialog.user?.email}</DialogTitle>
        <DialogContent>
          {PERMISSIONS.map(p => (
            <FormControlLabel
              key={p.key}
              control={
                <Checkbox
                  checked={!!permState[p.key]}
                  onChange={e => setPermState(s => ({ ...s, [p.key]: e.target.checked }))}
                />
              }
              label={p.label}
            />
          ))}
          {permError && <Alert severity="error">{permError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermDialog({ open: false, user: null })}>Annuler</Button>
          <Button onClick={handleSavePerms} variant="contained" disabled={permSaving}>
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
