/**
 * Public page — employee confirms or declines a proposed shift / series.
 * /planning/confirm/:token?action=confirm|decline
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from '@mui/material';
import { apiConfig } from '../../config/api';

interface ConfirmInfo {
  establishment_name: string;
  employee_name: string;
  recurrence: string;
  approval_status: string;
  shift_count: number;
  first_shift: { starts_at: string; ends_at: string; label: string | null };
  pending: boolean;
}

const RECURRENCE_FR: Record<string, string> = {
  once: 'Une seule fois',
  daily: 'Tous les jours',
  weekly: 'Toutes les semaines',
  monthly: 'Tous les mois',
  yearly: 'Tous les ans',
};

const PublicShiftConfirmPage: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const [search] = useSearchParams();
  const [info, setInfo] = useState<ConfirmInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'confirmed' | 'declined' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!apiConfig.isReady()) await apiConfig.initialize();
      const res = await fetch(
        apiConfig.getEndpoint(`/api/public/planning/confirm/${encodeURIComponent(token)}`)
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errObj = (body as { error?: string | { message?: string } }).error;
        throw new Error(
          typeof errObj === 'string' ? errObj : errObj?.message || `Erreur ${res.status}`
        );
      }
      setInfo(body as ConfirmInfo);
      if (!(body as ConfirmInfo).pending) {
        setDone(
          (body as ConfirmInfo).approval_status === 'declined' ? 'declined' : 'confirmed'
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lien invalide');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const action = search.get('action');
    if (!info?.pending || busy || done) return;
    if (action === 'confirm' || action === 'decline') {
      void submit(action);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info?.pending]);

  const submit = async (action: 'confirm' | 'decline') => {
    setBusy(true);
    setError(null);
    try {
      if (!apiConfig.isReady()) await apiConfig.initialize();
      const res = await fetch(
        apiConfig.getEndpoint(`/api/public/planning/confirm/${encodeURIComponent(token)}`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errObj = (body as { error?: string | { message?: string } }).error;
        throw new Error(
          typeof errObj === 'string' ? errObj : errObj?.message || `Erreur ${res.status}`
        );
      }
      setDone(action === 'confirm' ? 'confirmed' : 'declined');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setBusy(false);
    }
  };

  const firstLabel = info
    ? (() => {
        try {
          const start = new Date(info.first_shift.starts_at);
          const end = new Date(info.first_shift.ends_at);
          return `${start.toLocaleString('fr-FR')} – ${end.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}`;
        } catch {
          return info.first_shift.starts_at;
        }
      })()
    : '';

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Confirmation de planning
        </Typography>
        {loading && (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {info && !loading && (
          <>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>{info.establishment_name}</strong>
              {info.employee_name ? ` — ${info.employee_name}` : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Fréquence : {RECURRENCE_FR[info.recurrence] || info.recurrence}
              <br />
              {info.shift_count > 1
                ? `${info.shift_count} vacations proposées`
                : '1 vacation proposée'}
              <br />
              Première : {firstLabel}
              {info.first_shift.label ? ` · ${info.first_shift.label}` : ''}
            </Typography>

            {done === 'confirmed' && (
              <Alert severity="success">Planning confirmé. Merci !</Alert>
            )}
            {done === 'declined' && (
              <Alert severity="warning">Proposition refusée. L’établissement en a été informé via le statut.</Alert>
            )}

            {info.pending && !done && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  disabled={busy}
                  onClick={() => void submit('confirm')}
                >
                  Confirmer
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  disabled={busy}
                  onClick={() => void submit('decline')}
                >
                  Refuser
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default PublicShiftConfirmPage;
