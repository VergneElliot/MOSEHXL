import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Checkbox, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, Alert
} from '@mui/material';

const PERMISSIONS = [
  { key: 'access_pos', label: 'Caisse' },
  { key: 'access_menu', label: 'Gestion Menu' },
  { key: 'access_happy_hour', label: 'Happy Hour' },
  { key: 'access_history', label: 'Historique' },
  { key: 'access_settings', label: 'Paramètres' },
  { key: 'access_compliance', label: 'Conformité' }
];

const UserManagement: React.FC<{ token: string }> = ({ token }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [permDialog, setPermDialog] = useState<{ open: boolean; user: any | null }>({ open: false, user: null });
  const [permState, setPermState] = useState<{ [key: string]: boolean }>({});
  const [permSaving, setPermSaving] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:3001/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erreur chargement utilisateurs');
      setUsers(await res.json());
    } catch (e) {
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [token]);

  const handleAddUser = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: newEmail, password: newPassword, is_admin: newIsAdmin })
      });
      if (!res.ok) throw new Error('Erreur création utilisateur');
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
    const res = await fetch(`http://localhost:3001/api/auth/users/${user.id}/permissions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const state: { [key: string]: boolean } = {};
    PERMISSIONS.forEach(p => { state[p.key] = data.permissions.includes(p.key); });
    setPermState(state);
  };

  const handleSavePerms = async () => {
    setPermSaving(true);
    setPermError(null);
    const userId = permDialog.user.id;
    const perms = Object.keys(permState).filter(k => permState[k]);
    try {
      const res = await fetch(`http://localhost:3001/api/auth/users/${userId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ permissions: perms })
      });
      if (!res.ok) throw new Error('Erreur sauvegarde permissions');
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
      <Typography variant="h5" gutterBottom>Gestion des utilisateurs</Typography>
      <Button variant="contained" onClick={() => setShowAdd(true)} sx={{ mb: 2 }}>Ajouter un utilisateur</Button>
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
                  <Button size="small" onClick={() => openPermDialog(user)}>Permissions</Button>
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
            control={<Checkbox checked={newIsAdmin} onChange={e => setNewIsAdmin(e.target.checked)} />}
            label="Admin"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAdd(false)}>Annuler</Button>
          <Button onClick={handleAddUser} variant="contained">Créer</Button>
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
          <Button onClick={handleSavePerms} variant="contained" disabled={permSaving}>Sauvegarder</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement; 