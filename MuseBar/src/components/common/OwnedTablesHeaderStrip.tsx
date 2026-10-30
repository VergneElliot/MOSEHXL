/**
 * Header strip: owned open tables for the active PIN + return to portal.
 * Replaces PIN session tabs for account switching.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Chip, CircularProgress, Tooltip, Typography } from '@mui/material';
import { Close as CloseIcon, TableRestaurant as TableIcon } from '@mui/icons-material';
import { usePinSessions } from '../../contexts/PinSessionsContext';
import {
  listOwnedTablesForSession,
  type PinPortalOwnedTableDto,
} from '../../services/api/pin';
import { useVisibleInterval } from '../../hooks/useVisibleInterval';

const POLL_MS = 12_000;

export type OwnedTablesHeaderStripProps = {
  onReturnToPortal: () => void;
  onSelectTable?: (table: PinPortalOwnedTableDto) => void;
};

export const OwnedTablesHeaderStrip: React.FC<OwnedTablesHeaderStripProps> = ({
  onReturnToPortal,
  onSelectTable,
}) => {
  const { activeSession } = usePinSessions();
  const sessionId = activeSession?.actor.sessionId ?? activeSession?.id ?? null;
  const [tables, setTables] = useState<PinPortalOwnedTableDto[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setTables([]);
      return;
    }
    setLoading(true);
    try {
      setTables(await listOwnedTablesForSession(sessionId));
    } catch {
      /* best-effort */
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useVisibleInterval(() => {
    void refresh();
  }, POLL_MS, true);

  if (!activeSession) return <Box sx={{ flex: 1 }} />;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        minWidth: 0,
        flex: 1,
        px: 0.5,
        py: 0.25,
      }}
    >
      <Typography
        variant="body2"
        noWrap
        sx={{ fontWeight: 600, color: 'primary.main', flexShrink: 0, maxWidth: 140 }}
      >
        {activeSession.actor.displayName}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          minWidth: 0,
          flex: 1,
          overflowX: 'auto',
        }}
      >
        {loading && tables.length === 0 ? (
          <CircularProgress size={16} />
        ) : tables.length === 0 ? (
          <Typography variant="caption" color="text.secondary" noWrap>
            Aucune table ouverte
          </Typography>
        ) : (
          tables.map((t) => (
            <Chip
              key={t.open_ticket_id}
              size="small"
              icon={<TableIcon />}
              label={t.label}
              onClick={onSelectTable ? () => onSelectTable(t) : undefined}
              sx={{ flexShrink: 0 }}
            />
          ))
        )}
      </Box>
      <Tooltip title="Retour au portail équipe (sans pointer la sortie)">
        <Button
          size="small"
          variant="contained"
          color="error"
          startIcon={<CloseIcon />}
          onClick={onReturnToPortal}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            flexShrink: 0,
            bgcolor: '#c62828',
            '&:hover': { bgcolor: '#b71c1c' },
          }}
        >
          Portail
        </Button>
      </Tooltip>
    </Box>
  );
};

export default OwnedTablesHeaderStrip;
