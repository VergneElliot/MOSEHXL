import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, CircularProgress, Paper, FormControlLabel, Checkbox } from '@mui/material';

interface LoginProps {
  onLogin: (token: string, user: any, rememberMe: boolean, expiresIn: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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
        body: JSON.stringify({ email, password, rememberMe })
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur de connexion');
        setLoading(false);
        return;
      }
      const data = await res.json();
      onLogin(data.token, data.user, rememberMe, data.expiresIn);
    } catch (err) {
      setError('Erreur réseau ou serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="80vh"
      sx={{ p: { xs: 2, sm: 3 } }}
    >
      <Paper sx={{ 
        p: { xs: 3, sm: 4 }, 
        minWidth: { xs: '100%', sm: 320 },
        maxWidth: { xs: '100%', sm: 400 },
        width: '100%'
      }}>
        <Typography 
          variant="h5" 
          gutterBottom
          sx={{ 
            fontSize: { xs: '1.5rem', sm: '1.75rem' },
            textAlign: 'center',
            mb: { xs: 2, sm: 1 }
          }}
        >
          Connexion
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            fullWidth
            margin="normal"
            required
            sx={{
              '& .MuiInputBase-input': {
                fontSize: { xs: '1rem', sm: '0.875rem' },
                py: { xs: 1.5, sm: 1 }
              },
              '& .MuiInputLabel-root': {
                fontSize: { xs: '1rem', sm: '0.875rem' }
              }
            }}
          />
          <TextField
            label="Mot de passe"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            fullWidth
            margin="normal"
            required
            sx={{
              '& .MuiInputBase-input': {
                fontSize: { xs: '1rem', sm: '0.875rem' },
                py: { xs: 1.5, sm: 1 }
              },
              '& .MuiInputLabel-root': {
                fontSize: { xs: '1rem', sm: '0.875rem' }
              }
            }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                color="primary"
                sx={{ 
                  '& .MuiSvgIcon-root': { 
                    fontSize: { xs: 24, sm: 20 } 
                  } 
                }}
              />
            }
            label="Rester connecté"
            sx={{ 
              mt: { xs: 2, sm: 1 },
              '& .MuiTypography-root': {
                fontSize: { xs: '1rem', sm: '0.875rem' }
              }
            }}
          />
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mt: 2,
                '& .MuiAlert-message': {
                  fontSize: { xs: '0.9rem', sm: '0.875rem' }
                }
              }}
            >
              {error}
            </Alert>
          )}
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              disabled={loading}
              fullWidth
              size="large"
              sx={{
                py: { xs: 1.5, sm: 1 },
                fontSize: { xs: '1.1rem', sm: '0.875rem' },
                fontWeight: 'bold'
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Se connecter'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default Login; 