/**
 * Public page — employee confirms or declines planning changes (batch).
 * /planning/confirm/:token
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  FormControlLabel,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { apiConfig } from '../../config/api';
import { formatDate, formatTime } from '../../utils/formatDate';

interface ConfirmItem {
  id: string;
  change_type: string;
  change_label: string;
  starts_at: string | null;
  ends_at: string | null;
  label: string | null;
  previous_starts_at: string | null;
  previous_ends_at: string | null;
  previous_label: string | null;
  decision: string;
  decline_reason: string | null;
  decidable: boolean;
}

interface ConfirmInfo {
  mode?: 'batch' | 'legacy';
  establishment_name: string;
  employee_name: string;
  pending: boolean;
  closed?: boolean;
  items?: ConfirmItem[];
}

function formatRange(startsAt: string, endsAt: string): string {
  return `${formatDate(startsAt)} ${formatTime(startsAt)} – ${formatTime(endsAt)}`;
}

const PublicShiftConfirmPage: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const [info, setInfo] = useState<ConfirmInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [refuseMode, setRefuseMode] = useState(false);
  const [motif, setMotif] = useState('');

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
      const data = body as ConfirmInfo;
      setInfo(data);
      const initial: Record<string, boolean> = {};
      for (const item of data.items || []) {
        if (item.decidable) initial[item.id] = true;
      }
      setSelected(initial);
      if (!data.pending) setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lien invalide');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const decidableItems = useMemo(
    () => (info?.items || []).filter((i) => i.decidable),
    [info]
  );
  const infoItems = useMemo(
    () => (info?.items || []).filter((i) => i.change_type === 'delete'),
    [info]
  );

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => id),
    [selected]
  );

  const post = async (payload: unknown) => {
    setBusy(true);
    setError(null);
    try {
      if (!apiConfig.isReady()) await apiConfig.initialize();
      const res = await fetch(
        apiConfig.getEndpoint(`/api/public/planning/confirm/${encodeURIComponent(token)}`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errObj = (body as { error?: string | { message?: string } }).error;
        throw new Error(
          typeof errObj === 'string' ? errObj : errObj?.message || `Erreur ${res.status}`
        );
      }
      setDone(true);
      setRefuseMode(false);
      setMotif('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setBusy(false);
    }
  };

  const confirmSelected = () => {
    if (selectedIds.length === 0) {
      setError('Sélectionnez au moins une modification');
      return;
    }
    void post({
      decisions: selectedIds.map((id) => ({
        item_id: id,
        action: 'confirm',
      })),
    });
  };

  const refuseSelected = () => {
    if (selectedIds.length === 0) {
      setError('Sélectionnez au moins une modification à refuser');
      return;
    }
    if (!motif.trim()) {
      setError('Indiquez un motif de refus');
      return;
    }
    void post({
      decisions: selectedIds.map((id) => ({
        item_id: id,
        action: 'decline',
        reason: motif.trim(),
      })),
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={6}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Confirmation de planning
        </Typography>
        {info && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {info.establishment_name}
            {info.employee_name ? ` · ${info.employee_name}` : ''}
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {done && !info?.pending && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Vos réponses ont bien été enregistrées. Merci.
          </Alert>
        )}

        {infoItems.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Annulations déjà appliquées
            </Typography>
            {infoItems.map((item) => (
              <Typography key={item.id} variant="body2" sx={{ mb: 0.5 }}>
                •{' '}
                {item.starts_at && item.ends_at
                  ? formatRange(item.starts_at, item.ends_at)
                  : '—'}
                {item.label ? ` · ${item.label}` : ''}
              </Typography>
            ))}
          </Box>
        )}

        {decidableItems.length > 0 && (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Modifications à confirmer ou refuser
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Button
                size="small"
                onClick={() => {
                  const next: Record<string, boolean> = {};
                  for (const i of decidableItems) next[i.id] = true;
                  setSelected(next);
                }}
              >
                Tout cocher
              </Button>
              <Button
                size="small"
                onClick={() => {
                  const next: Record<string, boolean> = {};
                  for (const i of decidableItems) next[i.id] = false;
                  setSelected(next);
                }}
              >
                Tout décocher
              </Button>
            </Box>
            {decidableItems.map((item) => (
              <Box
                key={item.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 1.5,
                  mb: 1,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(selected[item.id])}
                      onChange={(e) =>
                        setSelected((prev) => ({ ...prev, [item.id]: e.target.checked }))
                      }
                      disabled={busy || !info?.pending}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {item.change_label}
                      </Typography>
                      {item.change_type === 'update' &&
                      item.previous_starts_at &&
                      item.previous_ends_at &&
                      item.starts_at &&
                      item.ends_at ? (
                        <Typography variant="body2">
                          {formatRange(item.previous_starts_at, item.previous_ends_at)} →{' '}
                          <strong>{formatRange(item.starts_at, item.ends_at)}</strong>
                        </Typography>
                      ) : (
                        <Typography variant="body2">
                          {item.starts_at && item.ends_at
                            ? formatRange(item.starts_at, item.ends_at)
                            : '—'}
                        </Typography>
                      )}
                      {item.label && (
                        <Typography variant="caption" color="text.secondary">
                          {item.label}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </Box>
            ))}

            {info?.pending && (
              <>
                {refuseMode && (
                  <TextField
                    label="Motif du refus"
                    fullWidth
                    required
                    multiline
                    minRows={2}
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    disabled={busy}
                    sx={{ mb: 2 }}
                  />
                )}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {!refuseMode ? (
                    <>
                      <Button
                        variant="contained"
                        color="success"
                        disabled={busy}
                        onClick={confirmSelected}
                      >
                        Confirmer la sélection
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        disabled={busy}
                        onClick={() => setRefuseMode(true)}
                      >
                        Refuser la sélection…
                      </Button>
                      <Button
                        variant="text"
                        disabled={busy}
                        onClick={() => void post({ action: 'confirm_all' })}
                      >
                        Tout confirmer
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="contained"
                        color="error"
                        disabled={busy}
                        onClick={refuseSelected}
                      >
                        Confirmer le refus
                      </Button>
                      <Button disabled={busy} onClick={() => setRefuseMode(false)}>
                        Retour
                      </Button>
                      <Button
                        variant="text"
                        color="error"
                        disabled={busy || !motif.trim()}
                        onClick={() =>
                          void post({ action: 'decline_all', reason: motif.trim() })
                        }
                      >
                        Tout refuser
                      </Button>
                    </>
                  )}
                </Box>
              </>
            )}
          </>
        )}

        {!loading && info && decidableItems.length === 0 && infoItems.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Aucune modification en attente pour ce lien.
          </Typography>
        )}
      </Paper>
    </Container>
  );
};

export default PublicShiftConfirmPage;
