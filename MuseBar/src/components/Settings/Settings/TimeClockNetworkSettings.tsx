import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  MyLocation as CaptureIcon,
  Wifi as WifiIcon,
} from '@mui/icons-material';
import {
  getTimeClockNetwork,
  updateTimeClockNetwork,
} from '../../../services/api/adminSpace';

/**
 * Admin settings: public IPs / CIDRs allowed for employee clock-in/out.
 */
export const TimeClockNetworkSettings: React.FC = () => {
  const [ips, setIps] = useState<string[]>([]);
  const [clientIp, setClientIp] = useState<string | null>(null);
  const [newIp, setNewIp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTimeClockNetwork();
      setIps(data.allowed_ips);
      setClientIp(data.client_ip);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement réseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveIps = async (next: string[], captureCurrent = false) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const data = await updateTimeClockNetwork({
        allowed_ips: next,
        capture_current: captureCurrent,
      });
      setIps(data.allowed_ips);
      setClientIp(data.client_ip);
      setMessage('Réseau de pointage enregistré');
      setNewIp('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de l’enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const addManual = () => {
    const trimmed = newIp.trim();
    if (!trimmed) return;
    if (ips.includes(trimmed)) {
      setError('Cette IP est déjà dans la liste');
      return;
    }
    void saveIps([...ips, trimmed]);
  };

  const removeIp = (ip: string) => {
    void saveIps(ips.filter((x) => x !== ip));
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <WifiIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Réseau de pointage</Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Les employés ne peuvent pointer (entrée / sortie) que depuis les adresses IP
          publiques listées ci-dessous — en pratique l&apos;IP Internet de la box Wi‑Fi
          de l&apos;établissement. Connectez-vous au Wi‑Fi du bar puis cliquez sur
          « Ajouter l&apos;IP actuelle ».
        </Typography>

        {message && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <CircularProgress size={28} />
        ) : (
          <>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Votre IP actuelle :{' '}
              <Chip size="small" label={clientIp || 'inconnue'} />
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<CaptureIcon />}
                disabled={saving || !clientIp}
                onClick={() => void saveIps(ips, true)}
              >
                Ajouter l&apos;IP actuelle
              </Button>
            </Stack>

            <Stack spacing={1} sx={{ mb: 2 }}>
              {ips.length === 0 ? (
                <Alert severity="warning">
                  Aucune IP autorisée — le pointage est bloqué jusqu&apos;à configuration.
                </Alert>
              ) : (
                ips.map((ip) => (
                  <Box
                    key={ip}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      px: 1.5,
                      py: 0.5,
                    }}
                  >
                    <Typography fontFamily="monospace">{ip}</Typography>
                    <IconButton
                      size="small"
                      aria-label={`Supprimer ${ip}`}
                      disabled={saving}
                      onClick={() => removeIp(ip)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))
              )}
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                size="small"
                fullWidth
                label="IP ou CIDR (ex. 203.0.113.10 ou 203.0.113.0/24)"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addManual();
                }}
              />
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                disabled={saving || !newIp.trim()}
                onClick={addManual}
              >
                Ajouter
              </Button>
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TimeClockNetworkSettings;
