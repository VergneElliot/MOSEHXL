/**
 * Header status for pointage — open/close is via PIN badge only.
 * Follows the **active** PIN session (not the venue-login JWT alone).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Chip, CircularProgress, Tooltip } from '@mui/material';
import { getTimeClockStatus, TimeClockStatusDto } from '../../services/api/adminSpace';
import { usePinSessions } from '../../contexts/PinSessionsContext';

function formatElapsed(isoStart: string, now: number): string {
  const ms = Math.max(0, now - new Date(isoStart).getTime());
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

export const TimeClockHeaderControl: React.FC = () => {
  const { activeSession } = usePinSessions();
  const actorUserId = activeSession?.actor.userId ?? null;
  const [status, setStatus] = useState<TimeClockStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    if (actorUserId == null) {
      setStatus(null);
      setLoading(false);
      return;
    }
    try {
      const data = await getTimeClockStatus();
      setStatus(data);
    } catch {
      /* status is best-effort in header */
    } finally {
      setLoading(false);
    }
  }, [actorUserId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!status?.open_entry) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [status?.open_entry]);

  if (actorUserId == null) {
    return (
      <Tooltip title="Ouvrir un badge PIN pour pointer l’entrée">
        <Chip
          size="small"
          label="Hors service"
          sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'white', height: 24 }}
        />
      </Tooltip>
    );
  }

  if (loading && !status) {
    return <CircularProgress size={18} sx={{ color: 'white' }} />;
  }
  if (!status?.open_entry) {
    return (
      <Tooltip title="Ouvrir un badge PIN pour pointer l’entrée">
        <Chip
          size="small"
          label="Hors service"
          sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'white', height: 24 }}
        />
      </Tooltip>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Tooltip title="Fermer le badge PIN pour pointer la sortie (libérer les tables d’abord)">
        <Chip
          size="small"
          color="success"
          label={`En service ${formatElapsed(status.open_entry.clock_in_at, now)}`}
          sx={{ height: 24 }}
        />
      </Tooltip>
    </Box>
  );
};

export default TimeClockHeaderControl;
