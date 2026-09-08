import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  closePinSession,
  listActivePinSessions,
  type ActivePinSessionDto,
} from '../../../services/api/pin';
import { formatDate } from '../../../utils/formatDate';

/**
 * Badges currently open across the establishment. Closing one revokes its token immediately,
 * which is how a manager ends a session left open on a terminal that walked away.
 */
const ActivePinSessionsPanel: React.FC = () => {
  const [sessions, setSessions] = useState<ActivePinSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSessions(await listActivePinSessions());
      setError(null);
    } catch (err) {
      setError((err as { message?: string }).message || 'Impossible de charger les sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleClose = async (sessionId: string) => {
    setClosingId(sessionId);
    try {
      await closePinSession(sessionId);
      await load();
    } catch (err) {
      setError((err as { message?: string }).message || 'Impossible de fermer la session');
    } finally {
      setClosingId(null);
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="h6">Sessions PIN actives</Typography>
        <Button size="small" onClick={() => void load()} disabled={loading}>
          Rafraîchir
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Chaque session lie un badge PIN au compte depuis lequel il a été ouvert. Fermer une
        session révoque immédiatement son accès sur le terminal concerné.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <CircularProgress size={24} />
      ) : sessions.length === 0 ? (
        <Alert severity="info">Aucune session PIN ouverte actuellement.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Badge</TableCell>
                <TableCell>Compte d’ouverture</TableCell>
                <TableCell>Ouverte le</TableCell>
                <TableCell>Dernière activité</TableCell>
                <TableCell>Expire</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <Chip size="small" label={session.display_name} />
                  </TableCell>
                  <TableCell>{session.opened_by_email}</TableCell>
                  <TableCell>{formatDate(session.opened_at)}</TableCell>
                  <TableCell>{formatDate(session.last_seen_at)}</TableCell>
                  <TableCell>{formatDate(session.expires_at)}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      color="warning"
                      disabled={closingId === session.id}
                      onClick={() => void handleClose(session.id)}
                    >
                      Fermer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ActivePinSessionsPanel;
