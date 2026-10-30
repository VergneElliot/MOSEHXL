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
  WifiOff as WifiOffIcon,
} from '@mui/icons-material';
import {
  getTimeClockNetwork,
  updateTimeClockNetwork,
} from '../../../services/api/adminTimeClockNetwork';

/**
 * Admin settings: public IPs / CIDRs allowed for employee clock-in/out.
 * IPv6 captures store a /64 prefix so privacy-extension addresses keep matching.
 */
export const TimeClockNetworkSettings: React.FC = () => {
  const [ips, setIps] = useState<string[]>([]);
  const [clientIp, setClientIp] = useState<string | null>(null);
  const [onVenue, setOnVenue] = useState(false);
  const [ipv6Prefix, setIpv6Prefix] = useState<string | null>(null);
  const [newIp, setNewIp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyNetwork = (data: {
    allowed_ips: string[];
    client_ip: string | null;
    on_venue_network?: boolean;
    ipv6_prefix_suggestion?: string | null;
  }) => {
    setIps(data.allowed_ips);
    setClientIp(data.client_ip);
    setOnVenue(Boolean(data.on_venue_network));
    setIpv6Prefix(data.ipv6_prefix_suggestion ?? null);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTimeClockNetwork();
      applyNetwork(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement réseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveIps = async (
    next: string[],
    opts?: { captureCurrent?: boolean; captureAsPrefix?: boolean }
  ) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const data = await updateTimeClockNetwork({
        allowed_ips: next,
        capture_current: opts?.captureCurrent === true,
        capture_as_prefix: opts?.captureAsPrefix,
      });
      applyNetwork(data);
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
          Les adresses IP publiques / préfixes listés ci-dessous (IP Internet de la
          box Wi‑Fi du lieu) déterminent le <strong>pointage</strong> : ouvrir ou
          fermer un badge PIN <strong>depuis le Wi‑Fi du lieu</strong> enregistre
          l&apos;entrée / la sortie. En IPv6, les téléphones changent souvent
          d&apos;adresse : utilisez un préfixe <strong>/64</strong> (bouton dédié)
          plutôt que l&apos;adresse complète. Hors réseau autorisé, le badge
          s&apos;ouvre et se ferme <strong>sans</strong> compter d&apos;heures.
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
            <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="body2">Votre IP actuelle :</Typography>
              <Chip size="small" label={clientIp || 'inconnue'} />
              <Chip
                size="small"
                icon={onVenue ? <WifiIcon /> : <WifiOffIcon />}
                color={onVenue ? 'success' : 'warning'}
                label={
                  onVenue
                    ? 'Correspond à la liste — pointage actif'
                    : 'Ne correspond pas — pointage désactivé sur cet appareil'
                }
              />
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<CaptureIcon />}
                disabled={saving || !clientIp}
                onClick={() =>
                  void saveIps(ips, {
                    captureCurrent: true,
                    captureAsPrefix: Boolean(clientIp?.includes(':')),
                  })
                }
              >
                {clientIp?.includes(':')
                  ? 'Ajouter le préfixe IPv6 /64'
                  : 'Ajouter l’IP actuelle'}
              </Button>
              {ipv6Prefix && (
                <Button
                  variant="outlined"
                  disabled={saving || ips.includes(ipv6Prefix)}
                  onClick={() => void saveIps([...ips, ipv6Prefix])}
                >
                  Ajouter {ipv6Prefix}
                </Button>
              )}
            </Stack>

            <Stack spacing={1} sx={{ mb: 2 }}>
              {ips.length === 0 ? (
                <Alert severity="warning">
                  Aucune IP autorisée — les badges PIN s&apos;ouvrent et se ferment
                  partout, mais aucun pointage (heures) ne sera enregistré tant que
                  le Wi‑Fi du lieu n&apos;est pas configuré.
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
                label="IP ou CIDR (ex. 203.0.113.0/24 ou 2a02:…::/64)"
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
