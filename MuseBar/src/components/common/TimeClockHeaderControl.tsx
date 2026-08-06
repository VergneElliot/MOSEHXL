import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Login as ClockInIcon,
  Logout as ClockOutIcon,
  WifiOff as OfflineIcon,
} from '@mui/icons-material';
import {
  clockIn,
  clockOut,
  getTimeClockStatus,
  TimeClockStatusDto,
} from '../../services/api/adminSpace';

function formatElapsed(isoStart: string, now: number): string {
  const ms = Math.max(0, now - new Date(isoStart).getTime());
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

/**
 * Personal clock-in / clock-out control for the app header.
 * Disabled when the client is not on the venue's registered public IP.
 */
export const TimeClockHeaderControl: React.FC = () => {
  const [status, setStatus] = useState<TimeClockStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    try {
      const data = await getTimeClockStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur pointage');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!status?.open_entry) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [status?.open_entry]);

  const onToggle = async () => {
    if (!status?.on_venue_network) return;
    setBusy(true);
    setError(null);
    try {
      if (status.open_entry) {
        await clockOut();
      } else {
        await clockIn();
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du pointage');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !status) {
    return <CircularProgress size={18} sx={{ color: 'white' }} />;
  }
  if (!status) return null;

  const offline = !status.on_venue_network;
  const clockedIn = Boolean(status.open_entry);
  const tip = offline
    ? status.allowed_ips_configured
      ? "Hors réseau de l'établissement — pointage indisponible"
      : "Réseau de l'établissement non configuré (IP publique)"
    : clockedIn
      ? 'Cliquer pour pointer la sortie'
      : "Cliquer pour pointer l'entrée";

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ py: 0, px: 1, maxWidth: 220, '& .MuiAlert-message': { fontSize: 12 } }}
        >
          {error}
        </Alert>
      )}
      {clockedIn && status.open_entry && (
        <Chip
          size="small"
          color="success"
          label={`En service ${formatElapsed(status.open_entry.clock_in_at, now)}`}
          sx={{ fontWeight: 600 }}
        />
      )}
      {offline && (
        <Chip
          size="small"
          icon={<OfflineIcon />}
          label="Hors réseau"
          color="default"
          variant="outlined"
          sx={{ color: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,0.4)' }}
        />
      )}
      <Tooltip title={tip}>
        <span>
          <Button
            color="inherit"
            size="small"
            variant={clockedIn ? 'outlined' : 'contained'}
            disabled={busy || offline}
            onClick={() => void onToggle()}
            startIcon={clockedIn ? <ClockOutIcon /> : <ClockInIcon />}
            sx={{
              textTransform: 'none',
              bgcolor: clockedIn ? 'transparent' : 'success.main',
              '&:hover': { bgcolor: clockedIn ? 'rgba(255,255,255,0.08)' : 'success.dark' },
            }}
          >
            {clockedIn ? 'Sortie' : 'Entrée'}
          </Button>
        </span>
      </Tooltip>
    </Box>
  );
};

export default TimeClockHeaderControl;
