import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  getReservationClosedDates,
  getReservationsIcs,
  getReservationsPublicLink,
  listReservations,
  setReservationDayClosed,
  updateReservation,
  type ReservationDto,
} from '../../services/api/adminSpace';
import AdminMonthCalendar, {
  addMonths,
  startOfMonth,
  toLocalDateInputValue,
  type AdminCalendarItem,
} from './AdminMonthCalendar';
import { formatDate, formatTime, utcToParisDateTimeLocal } from '../../utils/formatDate';
import ReservationEditDialog from './ReservationEditDialog';
import { resolveInboxByReservation } from '../../services/api/adminInboxApi';
import { saveReservationEdit } from './saveReservationEdit';

function localDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const STATUSES = [
  { id: 'requested', label: 'Demandée' },
  { id: 'on_hold', label: 'En attente' },
  { id: 'confirmed', label: 'Confirmée' },
  { id: 'refused', label: 'Refusée' },
  { id: 'seated', label: 'Installée' },
  { id: 'no_show', label: 'No-show' },
  { id: 'cancelled', label: 'Annulée' },
];

const STATUS_COLOR: Record<string, string> = {
  confirmed: '#2e7d32',
  requested: '#0288d1',
  on_hold: '#ed6c02',
  refused: '#c62828',
  seated: '#6a1b9a',
  no_show: '#c62828',
  cancelled: '#757575',
};

type ReservationsPanelProps = {
  onOpenConversation?: (reservationId: number) => void;
};

const ReservationsPanel: React.FC<ReservationsPanelProps> = ({ onOpenConversation }) => {
  const [rows, setRows] = useState<ReservationDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [icsUrl, setIcsUrl] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [hoursConfigured, setHoursConfigured] = useState(true);
  const [open, setOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState(0);
  const [dayContext, setDayContext] = useState<Date | null>(null);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [dayStatusBusy, setDayStatusBusy] = useState(false);
  const [edit, setEdit] = useState<Partial<ReservationDto> | null>(null);
  const [commentDialog, setCommentDialog] = useState<{
    id: number;
    status: 'confirmed' | 'on_hold' | 'refused';
    commentaire: string;
  } | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [conversationBusy, setConversationBusy] = useState(false);

  const range = useMemo(() => {
    const from = addMonths(month, -1);
    const to = addMonths(month, 2);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [month]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [data, closed] = await Promise.all([
        listReservations(range),
        getReservationClosedDates().catch(() => ({ dates: [] as string[] })),
      ]);
      setRows(data.reservations);
      setClosedDates(closed.dates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    }
  }, [range]);

  useEffect(() => {
    void refresh();
    void getReservationsIcs()
      .then((r) => setIcsUrl(r.url))
      .catch(() => undefined);
    void getReservationsPublicLink()
      .then((r) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const url =
          r.slug && origin ? `${origin}/reserve/${r.slug}` : r.url;
        setPublicUrl(url);
        setHoursConfigured(r.opening_hours_configured);
      })
      .catch(() => undefined);
  }, [refresh]);

  const calendarItems: AdminCalendarItem[] = useMemo(
    () =>
      rows.map((r) => {
        const start = new Date(r.starts_at);
        const time = formatTime(r.starts_at);
        return {
          id: r.id,
          startsAt: start,
          title: `${time} · ${r.customer_name} (${r.party_size})`,
          subtitle: STATUSES.find((s) => s.id === r.status)?.label,
          color: STATUS_COLOR[r.status] || '#1976d2',
        };
      }),
    [rows]
  );

  /** Upcoming only — past stays on the calendar, not in this list. */
  const upcomingRows = useMemo(() => {
    const now = Date.now();
    return rows
      .filter((r) => new Date(r.starts_at).getTime() >= now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [rows]);

  const openCreate = (day?: Date) => {
    const alreadyClosed = day ? closedDates.includes(localDateKey(day)) : false;
    setDayContext(day || null);
    setDialogTab(day && alreadyClosed ? 1 : 0);
    if (day) {
      setEdit({
        customer_name: '',
        party_size: 2,
        starts_at: toLocalDateInputValue(day, 19, 0),
        status: 'requested',
        status_reason: null,
      });
    } else {
      const starts = new Date();
      starts.setMinutes(0, 0, 0);
      starts.setHours(starts.getHours() + 2);
      setEdit({
        customer_name: '',
        party_size: 2,
        starts_at: toLocalDateInputValue(starts, starts.getHours(), starts.getMinutes()),
        status: 'requested',
        status_reason: null,
      });
    }
    setOpen(true);
  };

  const openEdit = (r: ReservationDto) => {
    setDayContext(null);
    setDialogTab(0);
    setEdit({
      ...r,
      starts_at: utcToParisDateTimeLocal(r.starts_at),
    });
    setOpen(true);
  };

  const selectedDayKey = dayContext ? localDateKey(dayContext) : null;
  const selectedDayClosed = selectedDayKey
    ? closedDates.includes(selectedDayKey)
    : false;

  const toggleDayClosed = async (closed: boolean) => {
    if (!selectedDayKey) return;
    setDayStatusBusy(true);
    try {
      setError(null);
      const result = await setReservationDayClosed(selectedDayKey, closed);
      setClosedDates(result.dates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour du jour impossible');
    } finally {
      setDayStatusBusy(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'requested':
        return 'info';
      case 'on_hold':
        return 'warning';
      case 'refused':
      case 'no_show':
        return 'error';
      case 'cancelled':
        return 'default';
      case 'seated':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const applyQuickStatus = async (id: number, status: string, status_reason?: string) => {
    try {
      setError(null);
      await updateReservation(id, { status, status_reason: status_reason ?? null });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible');
    }
  };

  const copyPublicLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
    } catch {
      /* ignore */
    }
  };

  const saveEdit = async () => {
    if (!edit) return;
    const { emailWarning } = await saveReservationEdit(edit);
    if (emailWarning) setError(emailWarning);
    setOpen(false);
    setEdit(null);
    await refresh();
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {!hoursConfigured && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Configurez les plages de réservations dans Paramètres → Plages de réservations pour
          activer le calendrier public.
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button variant="contained" onClick={() => openCreate()}>
          Nouvelle réservation
        </Button>
        {publicUrl && (
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
            <Typography variant="body2">
              Lien public :{' '}
              <a href={publicUrl} target="_blank" rel="noreferrer">
                {publicUrl}
              </a>
            </Typography>
            <Tooltip title="Copier le lien">
              <IconButton size="small" onClick={() => void copyPublicLink()} aria-label="Copier">
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
        {icsUrl && (
          <Typography variant="body2">
            Flux calendrier (ICS) :{' '}
            <a href={icsUrl} target="_blank" rel="noreferrer">
              {icsUrl}
            </a>
          </Typography>
        )}
      </Box>

      <AdminMonthCalendar
        month={month}
        onMonthChange={setMonth}
        items={calendarItems}
        onDayClick={(day) => openCreate(day)}
        onItemClick={(item) => {
          const row = rows.find((r) => r.id === item.id);
          if (row) openEdit(row);
        }}
        dayClosed={(day) => closedDates.includes(localDateKey(day))}
      />

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        À venir
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Les réservations passées restent visibles sur le calendrier (cliquer pour modifier / no-show).
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Nombre de personnes</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {upcomingRows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{formatDate(r.starts_at)}</TableCell>
              <TableCell>
                <Typography fontWeight={600}>{r.customer_name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {[r.customer_phone, r.customer_email].filter(Boolean).join(' · ')}
                </Typography>
                {r.guest_reliability?.flagged && (
                  <Chip
                    size="small"
                    color="error"
                    label={`No-show (${r.guest_reliability.flag_count}×)`}
                    sx={{ mt: 0.5 }}
                  />
                )}
                {r.status_reason && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    Commentaire : {r.status_reason}
                  </Typography>
                )}
              </TableCell>
              <TableCell>{r.party_size}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  color={
                    statusColor(r.status) as
                      | 'default'
                      | 'success'
                      | 'info'
                      | 'error'
                      | 'secondary'
                      | 'warning'
                  }
                  label={STATUSES.find((s) => s.id === r.status)?.label ?? r.status}
                />
              </TableCell>
              <TableCell align="right">
                {r.status === 'requested' && (
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap">
                    <Button
                      size="small"
                      color="success"
                      onClick={() =>
                        setCommentDialog({ id: r.id, status: 'confirmed', commentaire: '' })
                      }
                    >
                      Confirmer
                    </Button>
                    <Button
                      size="small"
                      color="warning"
                      onClick={() =>
                        setCommentDialog({ id: r.id, status: 'on_hold', commentaire: '' })
                      }
                    >
                      En attente
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() =>
                        setCommentDialog({ id: r.id, status: 'refused', commentaire: '' })
                      }
                    >
                      Refuser
                    </Button>
                  </Stack>
                )}
                {r.status === 'on_hold' && (
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap">
                    <Button
                      size="small"
                      color="success"
                      onClick={() =>
                        setCommentDialog({ id: r.id, status: 'confirmed', commentaire: '' })
                      }
                    >
                      Confirmer
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() =>
                        setCommentDialog({ id: r.id, status: 'refused', commentaire: '' })
                      }
                    >
                      Refuser
                    </Button>
                  </Stack>
                )}
                <Button size="small" onClick={() => openEdit(r)}>
                  Modifier
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {upcomingRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>
                <Typography color="text.secondary">Aucune réservation à venir</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <ReservationEditDialog
        open={open}
        edit={edit}
        dayContext={dayContext}
        dialogTab={dialogTab}
        selectedDayClosed={selectedDayClosed}
        dayStatusBusy={dayStatusBusy}
        conversationBusy={conversationBusy}
        onClose={() => {
          setOpen(false);
          setDayContext(null);
          setDialogTab(0);
        }}
        onDialogTabChange={setDialogTab}
        onEditChange={setEdit}
        onSave={() => {
          void (async () => {
            try {
              await saveEdit();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Enregistrement impossible');
            }
          })();
        }}
        onToggleDayClosed={(closed) => void toggleDayClosed(closed)}
        onOpenConversation={
          edit?.id && onOpenConversation
            ? () => {
                void (async () => {
                  if (!edit.id) return;
                  setConversationBusy(true);
                  try {
                    setError(null);
                    const hit = await resolveInboxByReservation(edit.id);
                    setOpen(false);
                    onOpenConversation(edit.id);
                    void hit;
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : 'Aucune conversation trouvée pour cette réservation'
                    );
                  } finally {
                    setConversationBusy(false);
                  }
                })();
              }
            : undefined
        }
      />

      <Dialog
        open={Boolean(commentDialog)}
        onClose={() => setCommentDialog(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {commentDialog?.status === 'confirmed'
            ? 'Confirmer la réservation'
            : commentDialog?.status === 'refused'
              ? 'Refuser la réservation'
              : 'Mettre en attente'}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Commentaire"
            fullWidth
            multiline
            minRows={3}
            value={commentDialog?.commentaire || ''}
            onChange={(e) =>
              setCommentDialog(
                commentDialog ? { ...commentDialog, commentaire: e.target.value } : null
              )
            }
            helperText="Optionnel — visible dans l’e-mail au client"
            sx={{ mt: 1 }}
          />
          {!String(commentDialog?.commentaire || '').trim() && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Aucun commentaire : le client recevra le changement de statut sans information
              supplémentaire.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialog(null)}>Annuler</Button>
          <Button
            variant="contained"
            color={
              commentDialog?.status === 'refused'
                ? 'error'
                : commentDialog?.status === 'on_hold'
                  ? 'warning'
                  : 'success'
            }
            onClick={() => {
              void (async () => {
                if (!commentDialog) return;
                await applyQuickStatus(
                  commentDialog.id,
                  commentDialog.status,
                  commentDialog.commentaire.trim() || undefined
                );
                setCommentDialog(null);
              })();
            }}
          >
            Envoyer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReservationsPanel;
