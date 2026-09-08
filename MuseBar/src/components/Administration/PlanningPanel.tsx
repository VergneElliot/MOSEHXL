import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
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
  createLeave,
  commitPlanningShifts,
  duplicatePlanningWeek,
  getStaffIcs,
  listLeaves,
  listPlanningStaff,
  listShifts,
  previewLeaveCount,
  resetAllShifts,
  updateLeaveStatus,
  type LeaveCountPreviewDto,
  type StaffLeaveDto,
  type StaffShiftDto,
} from '../../services/api/adminSpace';
import AdminMonthCalendar, {
  addDays,
  addMonths,
  startOfMonth,
  toLocalDateInputValue,
  type AdminCalendarItem,
} from './AdminMonthCalendar';
import {
  applyPlanningDraftToShifts,
  emptyPlanningDraft,
  localIdToTempId,
  planningDraftCount,
  planningDraftIsDirty,
  setPlanningUiDirty,
  type PlanningDraftState,
} from './planningDraft';
import { ParisDateField, ParisDateTimeField } from '../common/ParisDateTimeField';
import {
  formatDateOnly,
  formatTime,
  parisDateTimeLocalToUtcIso,
  utcToParisDateTimeLocal,
} from '../../utils/formatDate';

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  paid_leave: 'Congés payés',
  rtt: 'RTT',
  sick_leave: 'Maladie',
  unpaid_leave: 'Sans solde',
  family_event: 'Événement familial',
  other: 'Autre',
};

const PlanningPanel: React.FC = () => {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [staff, setStaff] = useState<
    Array<{
      id: number;
      email: string;
      first_name: string | null;
      last_name: string | null;
      calendar_color?: string;
    }>
  >([]);
  const [shifts, setShifts] = useState<StaffShiftDto[]>([]);
  const [draft, setDraft] = useState<PlanningDraftState>(() => emptyPlanningDraft());
  const [leaves, setLeaves] = useState<StaffLeaveDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState<{
    user_id: number;
    leave_type: StaffLeaveDto['leave_type'];
    starts_on: string;
    ends_on: string;
    half_day_start: boolean;
    half_day_end: boolean;
    note: string;
  } | null>(null);
  const [leavePreview, setLeavePreview] = useState<LeaveCountPreviewDto | null>(null);
  const [form, setForm] = useState<{
    id?: number;
    user_id: number;
    starts_at: string;
    ends_at: string;
    label: string;
    recurrence: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    series_id?: string | null;
  } | null>(null);
  const [seriesScopeOpen, setSeriesScopeOpen] = useState(false);
  const [seriesScopeAction, setSeriesScopeAction] = useState<'save' | 'delete' | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const loadRange = useMemo(() => {
    const from = addMonths(month, -1);
    const to = addMonths(month, 2);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [month]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [staffRes, shiftsRes, leavesRes] = await Promise.all([
        listPlanningStaff(),
        listShifts(loadRange.from, loadRange.to),
        listLeaves(loadRange.from, loadRange.to),
      ]);
      setStaff(staffRes.staff);
      setShifts(shiftsRes.shifts);
      setLeaves(leavesRes.leaves);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    }
  }, [loadRange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const dirty = planningDraftIsDirty(draft);
  const dirtyCount = planningDraftCount(draft);

  useEffect(() => {
    setPlanningUiDirty(dirty);
    return () => setPlanningUiDirty(false);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const displayShifts = useMemo(
    () => applyPlanningDraftToShifts(shifts, draft),
    [shifts, draft]
  );

  useEffect(() => {
    if (!leaveOpen || !leaveForm?.starts_on || !leaveForm?.ends_on) {
      setLeavePreview(null);
      return;
    }
    if (leaveForm.ends_on < leaveForm.starts_on) {
      setLeavePreview(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void previewLeaveCount({
        starts_on: leaveForm.starts_on,
        ends_on: leaveForm.ends_on,
        half_day_start: leaveForm.half_day_start,
        half_day_end: leaveForm.half_day_end,
      })
        .then(setLeavePreview)
        .catch(() => setLeavePreview(null));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    leaveOpen,
    leaveForm?.starts_on,
    leaveForm?.ends_on,
    leaveForm?.half_day_start,
    leaveForm?.half_day_end,
  ]);

  const nameOf = (id: number) => {
    const u = staff.find((s) => s.id === id);
    if (!u) return `#${id}`;
    const n = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    return n || u.email;
  };

  const colorOf = (id: number) => {
    const u = staff.find((s) => s.id === id);
    return u?.calendar_color || '#1565C0';
  };

  const shiftsFor = (userId: number, day: Date) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = addDays(dayStart, 1);
    return displayShifts.filter((s) => {
      if (s.user_id !== userId) return false;
      const start = new Date(s.starts_at);
      return start >= dayStart && start < dayEnd;
    });
  };

  const calendarItems: AdminCalendarItem[] = useMemo(() => {
    const shiftItems = displayShifts.map((s) => {
      const start = new Date(s.starts_at);
      const time = `${formatTime(s.starts_at)}–${formatTime(s.ends_at)}`;
      const pending = s.approval_status === 'pending_employee' || Boolean(s._draft);
      return {
        id: s.id,
        startsAt: start,
        title: `${time} · ${nameOf(s.user_id)}${s.label ? ` · ${s.label}` : ''}${
          pending ? ' (en attente)' : ''
        }`,
        subtitle: pending
          ? s._draft
            ? 'Modification non enregistrée'
            : 'En attente de confirmation employé'
          : s.label || undefined,
        color: pending ? '#ED6C02' : colorOf(s.user_id),
      };
    });
    const leaveItems = leaves
      .filter((l) => l.status === 'approved' || l.status === 'pending')
      .map((l) => {
        const start = new Date(`${l.starts_on}T08:00:00`);
        const label = LEAVE_TYPE_LABELS[l.leave_type] ?? l.leave_type;
        const pending = l.status === 'pending';
        return {
          id: `leave-${l.id}`,
          startsAt: start,
          title: `${label} · ${nameOf(l.user_id)}${pending ? ' (demande)' : ''}`,
          subtitle: l.note || undefined,
          color: pending ? '#9c27b0' : '#2e7d32',
        };
      });
    return [...shiftItems, ...leaveItems];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayShifts, leaves, staff]);

  const openCreate = (day?: Date) => {
    const base = day ? new Date(day) : new Date(weekStart);
    const startStr = toLocalDateInputValue(base, 10, 0);
    const endStr = toLocalDateInputValue(base, 18, 0);
    setForm({
      user_id: staff[0]?.id ?? 0,
      starts_at: startStr,
      ends_at: endStr,
      label: '',
      recurrence: 'once',
      series_id: null,
    });
    setOpen(true);
  };

  const seriesSiblingCount = useMemo(() => {
    if (!form?.series_id) return 0;
    return displayShifts.filter((s) => s.series_id === form.series_id).length;
  }, [form?.series_id, displayShifts]);

  const persistShift = (applyTo: 'one' | 'series') => {
    if (!form?.user_id) return;
    const starts_at = parisDateTimeLocalToUtcIso(form.starts_at);
    const ends_at = parisDateTimeLocalToUtcIso(form.ends_at);
    setError(null);
    if (form.id != null && form.id > 0) {
      setDraft((prev) => {
        const updates = prev.updates.filter((u) => u.id !== form.id);
        updates.push({
          id: form.id!,
          apply_to: applyTo,
          user_id: form.user_id,
          starts_at,
          ends_at,
          label: form.label || undefined,
        });
        return { ...prev, updates };
      });
    } else if (form.id != null && form.id < 0) {
      // Editing a local create — update the create op
      setDraft((prev) => ({
        ...prev,
        creates: prev.creates.map((c) =>
          localIdToTempId(c.localId) === form.id
            ? {
                ...c,
                user_id: form.user_id,
                starts_at,
                ends_at,
                label: form.label || undefined,
              }
            : c
        ),
      }));
    } else {
      setDraft((prev) => ({
        ...prev,
        creates: [
          ...prev.creates,
          {
            localId: `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            user_id: form.user_id,
            starts_at,
            ends_at,
            label: form.label || undefined,
            recurrence: form.recurrence || 'once',
          },
        ],
      }));
    }
    setSeriesScopeOpen(false);
    setSeriesScopeAction(null);
    setOpen(false);
    setForm(null);
  };

  const removeShift = (applyTo: 'one' | 'series') => {
    if (!form?.id) return;
    setError(null);
    if (form.id < 0) {
      setDraft((prev) => ({
        ...prev,
        creates: prev.creates.filter((c) => localIdToTempId(c.localId) !== form.id),
      }));
    } else {
      setDraft((prev) => {
        const updates = prev.updates.filter((u) => u.id !== form.id);
        const deletes = prev.deletes.filter((d) => d.id !== form.id);
        deletes.push({ id: form.id!, apply_to: applyTo });
        return { ...prev, updates, deletes };
      });
    }
    setSeriesScopeOpen(false);
    setSeriesScopeAction(null);
    setOpen(false);
    setForm(null);
  };

  const requestSave = () => {
    if (!form?.user_id) return;
    if (form.id && form.id > 0 && form.series_id) {
      setSeriesScopeAction('save');
      setSeriesScopeOpen(true);
      return;
    }
    persistShift('one');
  };

  const requestDelete = () => {
    if (!form?.id) return;
    if (form.id > 0 && form.series_id) {
      setSeriesScopeAction('delete');
      setSeriesScopeOpen(true);
      return;
    }
    if (!window.confirm('Supprimer cette vacation ?')) return;
    removeShift('one');
  };

  const saveAllChanges = async () => {
    if (!dirty) return;
    setBusy(true);
    setError(null);
    setSaveMessage(null);
    try {
      const result = await commitPlanningShifts({
        creates: draft.creates.map((c) => ({
          user_id: c.user_id,
          starts_at: c.starts_at,
          ends_at: c.ends_at,
          label: c.label,
          recurrence: c.recurrence,
        })),
        updates: draft.updates,
        deletes: draft.deletes,
      });
      setDraft(emptyPlanningDraft());
      setSaveMessage(
        result.message ||
          `Enregistré : ${result.created_count} créées, ${result.updated_count} modifiées, ${result.deleted_count} supprimées.`
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  };

  const discardChanges = () => {
    setDraft(emptyPlanningDraft());
    setDiscardOpen(false);
    setSaveMessage('Modifications locales annulées');
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {saveMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaveMessage(null)}>
          {saveMessage}
        </Alert>
      )}
      {dirty && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button color="inherit" size="small" onClick={() => setDiscardOpen(true)} disabled={busy}>
                Annuler
              </Button>
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={() => void saveAllChanges()}
                disabled={busy}
              >
                Enregistrer ({dirtyCount})
              </Button>
            </Box>
          }
        >
          {dirtyCount} modification(s) non enregistrée(s) — les e-mails de confirmation seront
          envoyés uniquement à l’enregistrement.
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button variant="contained" onClick={() => openCreate()}>
          Ajouter une vacation
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={() => void saveAllChanges()}
          disabled={!dirty || busy}
        >
          Enregistrer les modifications{dirty ? ` (${dirtyCount})` : ''}
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            const today = new Date();
            const pad = (n: number) => String(n).padStart(2, '0');
            const d = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
            setLeaveForm({
              user_id: staff[0]?.id ?? 0,
              leave_type: 'paid_leave',
              starts_on: d,
              ends_on: d,
              half_day_start: false,
              half_day_end: false,
              note: '',
            });
            setLeavePreview(null);
            setLeaveOpen(true);
          }}
        >
          Demander un congé
        </Button>
        <Button
          onClick={async () => {
            const created = await duplicatePlanningWeek({
              source_from: weekStart.toISOString(),
              source_to: weekEnd.toISOString(),
              target_from: addDays(weekStart, 7).toISOString(),
            });
            alert(`${created.created} vacation(s) dupliquée(s) sur la semaine suivante.`);
            setWeekStart(addDays(weekStart, 7));
            setMonth(startOfMonth(addDays(weekStart, 7)));
          }}
        >
          Dupliquer la semaine →
        </Button>
        <Button onClick={() => window.print()}>Imprimer</Button>
        <Button
          color="error"
          variant="outlined"
          onClick={() => setResetConfirmOpen(true)}
          disabled={busy}
        >
          Réinitialiser le planning
        </Button>
      </Box>

      <AdminMonthCalendar
        month={month}
        onMonthChange={(m) => {
          setMonth(m);
          setWeekStart(startOfWeek(m));
        }}
        items={calendarItems}
        onDayClick={(day) => {
          setWeekStart(startOfWeek(day));
          openCreate(day);
        }}
        onItemClick={(item) => {
          if (typeof item.id === 'string' && item.id.startsWith('leave-')) return;
          const shift = displayShifts.find((s) => s.id === item.id);
          if (!shift) return;
          const start = new Date(shift.starts_at);
          setWeekStart(startOfWeek(start));
          setForm({
            id: shift.id,
            user_id: shift.user_id,
            starts_at: utcToParisDateTimeLocal(shift.starts_at),
            ends_at: utcToParisDateTimeLocal(shift.ends_at),
            label: shift.label || '',
            recurrence:
              shift.recurrence === 'daily' ||
              shift.recurrence === 'weekly' ||
              shift.recurrence === 'monthly' ||
              shift.recurrence === 'yearly'
                ? shift.recurrence
                : 'once',
            series_id: shift.series_id ?? null,
          });
          setOpen(true);
        }}
      />

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Grille semaine (par employé)
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button onClick={() => setWeekStart(addDays(weekStart, -7))}>Semaine précédente</Button>
        <Typography fontWeight={600}>
          Semaine du {formatDateOnly(weekStart)}
        </Typography>
        <Button onClick={() => setWeekStart(addDays(weekStart, 7))}>Semaine suivante</Button>
      </Box>

      <Table size="small" sx={{ '@media print': { fontSize: 12 } }}>
        <TableHead>
          <TableRow>
            <TableCell>Employé</TableCell>
            {days.map((d) => (
              <TableCell
                key={d.toISOString()}
                onClick={() => openCreate(d)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                title="Cliquer pour ajouter une vacation ce jour"
              >
                {formatDateOnly(d)}
              </TableCell>
            ))}
            <TableCell>ICS</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {staff.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{nameOf(u.id)}</TableCell>
              {days.map((d) => (
                <TableCell
                  key={`${u.id}-${d.toISOString()}`}
                  sx={{
                    verticalAlign: 'top',
                    cursor: 'pointer',
                    minWidth: 90,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => {
                    setForm({
                      user_id: u.id,
                      starts_at: toLocalDateInputValue(d, 10, 0),
                      ends_at: toLocalDateInputValue(d, 18, 0),
                      label: '',
                      recurrence: 'once',
                      series_id: null,
                    });
                    setOpen(true);
                  }}
                >
                  {shiftsFor(u.id, d).map((s) => {
                    const pending = s.approval_status === 'pending_employee' || Boolean(s._draft);
                    return (
                      <Box
                        key={s.id}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          bgcolor: pending ? 'warning.main' : colorOf(s.user_id),
                          color: pending ? 'warning.contrastText' : 'common.white',
                          borderRadius: 1,
                          p: 0.5,
                          mb: 0.5,
                          fontSize: 12,
                        }}
                        title={
                          s._draft
                            ? 'Non enregistré'
                            : pending
                              ? 'En attente de confirmation employé'
                              : undefined
                        }
                      >
                        {formatTime(s.starts_at)}–{formatTime(s.ends_at)}
                        {s.label ? ` ${s.label}` : ''}
                        {s._draft ? ' *' : pending ? ' (attente)' : ''}
                        <Button
                          size="small"
                          sx={{ color: 'inherit', minWidth: 0, p: 0, ml: 0.5 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (s.id > 0 && s.series_id) {
                              setForm({
                                id: s.id,
                                user_id: s.user_id,
                                starts_at: utcToParisDateTimeLocal(s.starts_at),
                                ends_at: utcToParisDateTimeLocal(s.ends_at),
                                label: s.label || '',
                                recurrence:
                                  s.recurrence === 'daily' ||
                                  s.recurrence === 'weekly' ||
                                  s.recurrence === 'monthly' ||
                                  s.recurrence === 'yearly'
                                    ? s.recurrence
                                    : 'once',
                                series_id: s.series_id ?? null,
                              });
                              setSeriesScopeAction('delete');
                              setSeriesScopeOpen(true);
                              return;
                            }
                            if (!window.confirm('Supprimer cette vacation ?')) return;
                            if (s.id < 0) {
                              setDraft((prev) => ({
                                ...prev,
                                creates: prev.creates.filter(
                                  (c) => localIdToTempId(c.localId) !== s.id
                                ),
                              }));
                            } else {
                              setDraft((prev) => {
                                const updates = prev.updates.filter((u) => u.id !== s.id);
                                const deletes = prev.deletes.filter((d) => d.id !== s.id);
                                deletes.push({ id: s.id, apply_to: 'one' });
                                return { ...prev, updates, deletes };
                              });
                            }
                          }}
                        >
                          ×
                        </Button>
                      </Box>
                    );
                  })}
                </TableCell>
              ))}
              <TableCell>
                <Button
                  size="small"
                  onClick={async () => {
                    const { url } = await getStaffIcs(u.id);
                    await navigator.clipboard.writeText(url);
                    alert(`Lien ICS copié :\n${url}`);
                  }}
                >
                  Copier ICS
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {leaves.filter((l) => l.status === 'pending').length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Congés en attente d&apos;approbation
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employé</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Période</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaves
                .filter((l) => l.status === 'pending')
                .map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{nameOf(l.user_id)}</TableCell>
                    <TableCell>{LEAVE_TYPE_LABELS[l.leave_type] ?? l.leave_type}</TableCell>
                    <TableCell>
                      {l.starts_on} → {l.ends_on}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="success"
                        onClick={async () => {
                          await updateLeaveStatus(l.id, { status: 'approved' });
                          await refresh();
                        }}
                      >
                        Approuver
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={async () => {
                          await updateLeaveStatus(l.id, { status: 'rejected' });
                          await refresh();
                        }}
                      >
                        Refuser
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={leaveOpen} onClose={() => setLeaveOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Demande de congé</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5, overflow: 'visible' }}>
          <TextField
            select
            label="Employé"
            value={leaveForm?.user_id ?? ''}
            onChange={(e) => setLeaveForm({ ...leaveForm!, user_id: Number(e.target.value) })}
            fullWidth
            InputLabelProps={{ shrink: true }}
          >
            {staff.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {nameOf(s.id)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Type"
            value={leaveForm?.leave_type ?? 'paid_leave'}
            onChange={(e) =>
              setLeaveForm({
                ...leaveForm!,
                leave_type: e.target.value as StaffLeaveDto['leave_type'],
              })
            }
            fullWidth
            InputLabelProps={{ shrink: true }}
          >
            {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v}
              </MenuItem>
            ))}
          </TextField>
          <ParisDateField
            label="Du (jj/mm/aaaa)"
            value={leaveForm?.starts_on ?? ''}
            onChange={(ymd) => setLeaveForm({ ...leaveForm!, starts_on: ymd })}
          />
          <ParisDateField
            label="Au (jj/mm/aaaa)"
            value={leaveForm?.ends_on ?? ''}
            onChange={(ymd) => setLeaveForm({ ...leaveForm!, ends_on: ymd })}
          />
          <TextField
            label="Motif (optionnel)"
            value={leaveForm?.note ?? ''}
            onChange={(e) => setLeaveForm({ ...leaveForm!, note: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />
          {leavePreview && (
            <Alert severity="info">
              <strong>{leavePreview.counted_days} jour(s) compté(s)</strong> pour le décompte CP
              {leavePreview.return_on ? ` · reprise le ${leavePreview.return_on}` : ''}.
              {leavePreview.excluded_public_holidays.length > 0 && (
                <>
                  {' '}
                  Jours fériés dans la période (non comptés) :{' '}
                  {leavePreview.excluded_public_holidays
                    .map((h) => `${h.name} (${h.date})`)
                    .join(', ')}
                  .
                </>
              )}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveOpen(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!leaveForm?.user_id) return;
              try {
                await createLeave({
                  ...leaveForm,
                  auto_approve: true,
                });
                setLeaveOpen(false);
                setLeaveForm(null);
                setLeavePreview(null);
                await refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Création impossible');
              }
            }}
          >
            Enregistrer (approuvé)
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{form?.id ? 'Modifier' : 'Nouvelle'} vacation</DialogTitle>
        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            // Avoid clipping floating InputLabel on the first field (MUI DialogContent overflow).
            overflow: 'visible',
            pt: 2.5,
          }}
        >
          <TextField
            select
            label="Employé"
            value={form?.user_id ?? ''}
            onChange={(e) => setForm({ ...form!, user_id: Number(e.target.value) })}
            fullWidth
            InputLabelProps={{ shrink: true }}
          >
            {staff.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {nameOf(s.id)}
              </MenuItem>
            ))}
          </TextField>
          <ParisDateTimeField
            dateLabel="Début — date (jj/mm/aaaa)"
            timeLabel="Début — heure (HH:mm)"
            value={form?.starts_at || ''}
            onChange={(next) => setForm({ ...form!, starts_at: next })}
          />
          <ParisDateTimeField
            dateLabel="Fin — date (jj/mm/aaaa)"
            timeLabel="Fin — heure (HH:mm)"
            value={form?.ends_at || ''}
            onChange={(next) => setForm({ ...form!, ends_at: next })}
          />
          {!form?.id && (
            <TextField
              select
              label="Fréquence"
              value={form?.recurrence ?? 'once'}
              onChange={(e) =>
                setForm({
                  ...form!,
                  recurrence: e.target.value as
                    | 'once'
                    | 'daily'
                    | 'weekly'
                    | 'monthly'
                    | 'yearly',
                })
              }
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="Les e-mails partent à l’enregistrement du planning (bouton Enregistrer les modifications)."
            >
              <MenuItem value="once">Une seule fois</MenuItem>
              <MenuItem value="daily">Tous les jours</MenuItem>
              <MenuItem value="weekly">Toutes les semaines</MenuItem>
              <MenuItem value="monthly">Tous les mois</MenuItem>
              <MenuItem value="yearly">Tous les ans</MenuItem>
            </TextField>
          )}
          {form?.id && form.series_id && (
            <Alert severity="info">
              Cette vacation appartient à une série ({seriesSiblingCount || 'plusieurs'} occurrence
              {seriesSiblingCount > 1 ? 's' : ''}). À l’enregistrement ou à la suppression, vous
              pourrez choisir d’appliquer le changement à toute la série.
            </Alert>
          )}
          <TextField
            label="Libellé"
            value={form?.label || ''}
            onChange={(e) => setForm({ ...form!, label: e.target.value })}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          {form?.id && (
            <Button color="error" sx={{ mr: 'auto' }} disabled={busy} onClick={requestDelete}>
              Supprimer
            </Button>
          )}
          <Button onClick={() => setOpen(false)} disabled={busy}>
            Annuler
          </Button>
          <Button variant="contained" disabled={busy} onClick={requestSave}>
            {form?.id ? 'Appliquer' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={seriesScopeOpen}
        onClose={() => {
          if (busy) return;
          setSeriesScopeOpen(false);
          setSeriesScopeAction(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {seriesScopeAction === 'delete'
            ? 'Supprimer la série ?'
            : 'Modifier la série ?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Cette vacation fait partie d’une série récurrente
            {seriesSiblingCount > 0 ? ` (${seriesSiblingCount} occurrences visibles)` : ''}.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {seriesScopeAction === 'delete'
              ? 'Choisissez de supprimer uniquement cette occurrence, ou toutes les vacations liées.'
              : 'Choisissez d’appliquer les modifications uniquement à cette occurrence, ou à toutes les vacations liées (horaires décalés de la même façon).'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button
            disabled={busy}
            onClick={() => {
              setSeriesScopeOpen(false);
              setSeriesScopeAction(null);
            }}
          >
            Annuler
          </Button>
          <Button
            disabled={busy}
            variant="outlined"
            onClick={() =>
              seriesScopeAction === 'delete' ? removeShift('one') : persistShift('one')
            }
          >
            Cette vacation seulement
          </Button>
          <Button
            disabled={busy}
            variant="contained"
            color={seriesScopeAction === 'delete' ? 'error' : 'primary'}
            onClick={() =>
              seriesScopeAction === 'delete'
                ? removeShift('series')
                : persistShift('series')
            }
          >
            Toute la série
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={discardOpen} onClose={() => setDiscardOpen(false)}>
        <DialogTitle>Annuler les modifications ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Les {dirtyCount} modification(s) non enregistrée(s) seront perdues.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardOpen(false)}>Retour</Button>
          <Button color="error" variant="contained" onClick={discardChanges}>
            Annuler les modifications
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={resetConfirmOpen}
        onClose={() => !busy && setResetConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Réinitialiser le planning</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Cette action est irréversible.
          </Alert>
          <Typography>
            Êtes-vous sûr de vouloir supprimer la totalité de tous les plannings (toutes les
            vacations de cet établissement) ?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Les congés ne sont pas concernés — seuls les créneaux du planning (vacations) seront
            effacés.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setResetConfirmOpen(false)}>
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                setError(null);
                const result = await resetAllShifts();
                setDraft(emptyPlanningDraft());
                setResetConfirmOpen(false);
                alert(`${result.deleted} vacation(s) supprimée(s).`);
                await refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Réinitialisation impossible');
              } finally {
                setBusy(false);
              }
            }}
          >
            Oui, tout supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlanningPanel;
