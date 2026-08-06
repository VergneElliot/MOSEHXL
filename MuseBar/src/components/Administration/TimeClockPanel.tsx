import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { PERMISSIONS } from '@mosehxl/types';
import type { User } from '../../types/auth';
import {
  deleteTimeEntry,
  listTimeClockStaff,
  listTimeEntries,
  punchTimeClock,
  TimeClockStaffDto,
  TimeEntryDto,
  TimeHoursTotalDto,
  updateTimeEntry,
} from '../../services/api/adminSpace';

function staffLabel(s: { first_name: string | null; last_name: string | null; email: string }) {
  const name = [s.first_name, s.last_name].filter(Boolean).join(' ').trim();
  return name || s.email;
}

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(local: string): string {
  return new Date(local).toISOString();
}

function startOfWeekIso(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.toISOString();
}

function endOfWeekIso(): string {
  const d = new Date(startOfWeekIso());
  d.setDate(d.getDate() + 7);
  return d.toISOString();
}

interface TimeClockPanelProps {
  user: User;
}

const TimeClockPanel: React.FC<TimeClockPanelProps> = ({ user }) => {
  const canManage =
    user.role === 'establishment_admin' ||
    (user.permissions ?? []).includes(PERMISSIONS.access_planning);

  const [staff, setStaff] = useState<TimeClockStaffDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [punchTarget, setPunchTarget] = useState<TimeClockStaffDto | null>(null);
  const [password, setPassword] = useState('');
  const [punchBusy, setPunchBusy] = useState(false);

  const [from, setFrom] = useState(startOfWeekIso);
  const [to, setTo] = useState(endOfWeekIso);
  const [entries, setEntries] = useState<TimeEntryDto[]>([]);
  const [totals, setTotals] = useState<TimeHoursTotalDto[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  const [editEntry, setEditEntry] = useState<TimeEntryDto | null>(null);
  const [editIn, setEditIn] = useState('');
  const [editOut, setEditOut] = useState('');
  const [editNote, setEditNote] = useState('');

  const refreshStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTimeClockStaff();
      setStaff(data.staff);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement employés');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshReport = useCallback(async () => {
    if (!canManage) return;
    setReportLoading(true);
    try {
      const data = await listTimeEntries(from, to);
      setEntries(data.entries);
      setTotals(data.totals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur rapport heures');
    } finally {
      setReportLoading(false);
    }
  }, [canManage, from, to]);

  useEffect(() => {
    void refreshStaff();
  }, [refreshStaff]);

  useEffect(() => {
    void refreshReport();
  }, [refreshReport]);

  const currentlyIn = useMemo(
    () => staff.filter((s) => s.open_entry),
    [staff]
  );

  const openPunch = (s: TimeClockStaffDto) => {
    setPunchTarget(s);
    setPassword('');
    setMessage(null);
  };

  const submitPunch = async () => {
    if (!punchTarget) return;
    setPunchBusy(true);
    setError(null);
    try {
      const result = await punchTimeClock(punchTarget.id, password);
      setMessage(
        result.action === 'clock_in'
          ? `Entrée enregistrée pour ${staffLabel(punchTarget)}`
          : `Sortie enregistrée pour ${staffLabel(punchTarget)}`
      );
      setPunchTarget(null);
      setPassword('');
      await refreshStaff();
      await refreshReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du pointage');
    } finally {
      setPunchBusy(false);
    }
  };

  const openEdit = (entry: TimeEntryDto) => {
    setEditEntry(entry);
    setEditIn(toLocalInputValue(entry.clock_in_at));
    setEditOut(toLocalInputValue(entry.clock_out_at));
    setEditNote(entry.note || '');
  };

  const saveEdit = async () => {
    if (!editEntry) return;
    try {
      await updateTimeEntry(editEntry.id, {
        clock_in_at: fromLocalInputValue(editIn),
        clock_out_at: editOut ? fromLocalInputValue(editOut) : null,
        note: editNote,
      });
      setEditEntry(null);
      await refreshReport();
      await refreshStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la modification');
    }
  };

  const removeEntry = async (id: number) => {
    if (!window.confirm('Supprimer ce pointage ?')) return;
    try {
      await deleteTimeEntry(id);
      await refreshReport();
      await refreshStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la suppression');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h5">Pointage</Typography>
          <Typography variant="body2" color="text.secondary">
            Terminal partagé : sélectionnez un employé et saisissez son mot de passe.
            Uniquement disponible sur le réseau de l&apos;établissement.
          </Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} onClick={() => void refreshStaff()} disabled={loading}>
          Actualiser
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert severity="success" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      {currentlyIn.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            En service maintenant
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {currentlyIn.map((s) => (
              <Chip
                key={s.id}
                color="success"
                label={staffLabel(s)}
                onClick={() => openPunch(s)}
              />
            ))}
          </Box>
        </Paper>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {staff.map((s) => {
            const inService = Boolean(s.open_entry);
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={s.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    borderColor: inService ? 'success.main' : 'divider',
                    bgcolor: inService ? 'success.50' : 'background.paper',
                    '&:hover': { boxShadow: 2 },
                  }}
                  onClick={() => openPunch(s)}
                >
                  <Typography variant="subtitle1" fontWeight={600}>
                    {staffLabel(s)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.email}
                  </Typography>
                  <Box mt={1}>
                    <Chip
                      size="small"
                      color={inService ? 'success' : 'default'}
                      label={inService ? 'En service — cliquer pour sortir' : 'Hors service — cliquer pour entrer'}
                    />
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {canManage && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Heures travaillées
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
            <TextField
              label="Du"
              type="datetime-local"
              size="small"
              value={toLocalInputValue(from)}
              onChange={(e) => setFrom(fromLocalInputValue(e.target.value))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Au"
              type="datetime-local"
              size="small"
              value={toLocalInputValue(to)}
              onChange={(e) => setTo(fromLocalInputValue(e.target.value))}
              InputLabelProps={{ shrink: true }}
            />
            <Button variant="outlined" onClick={() => void refreshReport()} disabled={reportLoading}>
              Filtrer
            </Button>
          </Box>

          {reportLoading ? (
            <CircularProgress size={24} />
          ) : (
            <>
              <Table size="small" sx={{ mb: 3 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Employé</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Pointages</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {totals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>Aucun pointage sur la période</TableCell>
                    </TableRow>
                  ) : (
                    totals.map((t) => (
                      <TableRow key={t.user_id}>
                        <TableCell>{staffLabel(t)}</TableCell>
                        <TableCell>{formatDuration(t.total_ms)}</TableCell>
                        <TableCell>{t.entry_count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <Typography variant="subtitle2" gutterBottom>
                Détail
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Employé</TableCell>
                    <TableCell>Entrée</TableCell>
                    <TableCell>Sortie</TableCell>
                    <TableCell>Durée</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map((e) => {
                    const start = new Date(e.clock_in_at).getTime();
                    const end = e.clock_out_at
                      ? new Date(e.clock_out_at).getTime()
                      : Date.now();
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          {staffLabel({
                            first_name: e.first_name ?? null,
                            last_name: e.last_name ?? null,
                            email: e.email || '',
                          })}
                        </TableCell>
                        <TableCell>
                          {new Date(e.clock_in_at).toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          {e.clock_out_at
                            ? new Date(e.clock_out_at).toLocaleString('fr-FR')
                            : '—'}
                        </TableCell>
                        <TableCell>{formatDuration(Math.max(0, end - start))}</TableCell>
                        <TableCell>{e.source}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => openEdit(e)} aria-label="Modifier">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => void removeEntry(e.id)}
                            aria-label="supprimer"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </Paper>
      )}

      <Dialog open={Boolean(punchTarget)} onClose={() => setPunchTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {punchTarget
            ? punchTarget.open_entry
              ? `Sortie — ${staffLabel(punchTarget)}`
              : `Entrée — ${staffLabel(punchTarget)}`
            : 'Pointage'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            type="password"
            label="Mot de passe de l'employé"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submitPunch();
            }}
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPunchTarget(null)}>Annuler</Button>
          <Button
            variant="contained"
            disabled={punchBusy || !password}
            onClick={() => void submitPunch()}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editEntry)} onClose={() => setEditEntry(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Corriger le pointage</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Entrée"
            type="datetime-local"
            value={editIn}
            onChange={(e) => setEditIn(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Sortie (vide = ouvert)"
            type="datetime-local"
            value={editOut}
            onChange={(e) => setEditOut(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Note"
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditEntry(null)}>Annuler</Button>
          <Button variant="contained" onClick={() => void saveEdit()}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TimeClockPanel;
