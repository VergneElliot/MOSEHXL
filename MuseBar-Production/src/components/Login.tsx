import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, CircularProgress, Paper } from '@mui/material';

interface LoginProps {
  onLogin: (token: string, user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur de connexion');
        setLoading(false);
        return;
      }
      const data = await res.json();
      onLogin(data.token, data.user);
    } catch (err) {
      setError('Erreur réseau ou serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
      <Paper sx={{ p: 4, minWidth: 320 }}>
        <Typography variant="h5" gutterBottom>Connexion</Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Mot de passe"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            fullWidth
            margin="normal"
            required
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button type="submit" variant="contained" color="primary" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Se connecter'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default Login; 