import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Alert, CircularProgress, Paper, FormControlLabel, Checkbox } from '@mui/material';
import { ApiService } from '../services/apiService';

interface LoginProps {
  onLogin: (token: string, user: any, rememberMe: boolean, expiresIn: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const apiService = ApiService.getInstance();

  useEffect(() => {
    const loadDebugInfo = async () => {
      try {
        const { apiConfig } = await import('../config/api');
        await apiConfig.initialize();
        const info = apiConfig.getConnectionInfo();
        setDebugInfo(`Backend: ${info.baseURL} | Host: ${info.currentHost} | Ready: ${info.isInitialized}`);
      } catch (error) {
        setDebugInfo(`Debug error: ${error}`);
      }
    };
    loadDebugInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Use ApiService to automatically handle network configuration
      const response = await apiService.post<{
        token: string;
        user: any;
        expiresIn: string;
      }>('/auth/login', {
        email,
        password,
        rememberMe
      });
      const data = response.data;
      onLogin(data.token, data.user, rememberMe, data.expiresIn);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Erreur réseau ou serveur');
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
          {debugInfo && (
            <Alert 
              severity="info" 
              sx={{ 
                mt: 1,
                '& .MuiAlert-message': {
                  fontSize: { xs: '0.8rem', sm: '0.75rem' },
                  wordBreak: 'break-all'
                }
              }}
            >
              Debug: {debugInfo}
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