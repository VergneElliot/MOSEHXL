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
  createShift,
  createLeave,
  deleteShift,
  duplicatePlanningWeek,
  getStaffIcs,
  listLeaves,
  listPlanningStaff,
  listShifts,
  previewLeaveCount,
  updateLeaveStatus,
  updateShift,
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
    Array<{ id: number; email: string; first_name: string | null; last_name: string | null }>
  >([]);
  const [shifts, setShifts] = useState<StaffShiftDto[]>([]);
  const [leaves, setLeaves] = useState<StaffLeaveDto[]>([]);
  const [error, setError] = useState<string | null>(null);
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
  } | null>(null);

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

  const shiftsFor = (userId: number, day: Date) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = addDays(dayStart, 1);
    return shifts.filter((s) => {
      if (s.user_id !== userId) return false;
      const start = new Date(s.starts_at);
      return start >= dayStart && start < dayEnd;
    });
  };

  const calendarItems: AdminCalendarItem[] = useMemo(() => {
    const shiftItems = shifts.map((s) => {
      const start = new Date(s.starts_at);
      const end = new Date(s.ends_at);
      const time = `${start.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })}–${end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      const pending = s.approval_status === 'pending_employee';
      return {
        id: s.id,
        startsAt: start,
        title: `${time} · ${nameOf(s.user_id)}${s.label ? ` · ${s.label}` : ''}${
          pending ? ' (en attente)' : ''
        }`,
        subtitle: pending ? 'En attente de confirmation employé' : s.label || undefined,
        color: pending ? '#ed6c02' : '#1565c0',
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
  }, [shifts, leaves, staff]);

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
    });
    setOpen(true);
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button variant="contained" onClick={() => openCreate()}>
          Ajouter une vacation
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
          const shift = shifts.find((s) => s.id === item.id);
          if (!shift) return;
          const start = new Date(shift.starts_at);
          const end = new Date(shift.ends_at);
          setWeekStart(startOfWeek(start));
          setForm({
            id: shift.id,
            user_id: shift.user_id,
            starts_at: toLocalDateInputValue(start, start.getHours(), start.getMinutes()),
            ends_at: toLocalDateInputValue(end, end.getHours(), end.getMinutes()),
            label: shift.label || '',
            recurrence:
              shift.recurrence === 'daily' ||
              shift.recurrence === 'weekly' ||
              shift.recurrence === 'monthly' ||
              shift.recurrence === 'yearly'
                ? shift.recurrence
                : 'once',
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
          Semaine du {weekStart.toLocaleDateString('fr-FR')}
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
                {d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
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
                    });
                    setOpen(true);
                  }}
                >
                  {shiftsFor(u.id, d).map((s) => {
                    const pending = s.approval_status === 'pending_employee';
                    return (
                      <Box
                        key={s.id}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          bgcolor: pending ? 'warning.main' : 'primary.light',
                          color: pending ? 'warning.contrastText' : 'primary.contrastText',
                          borderRadius: 1,
                          p: 0.5,
                          mb: 0.5,
                          fontSize: 12,
                        }}
                        title={pending ? 'En attente de confirmation employé' : undefined}
                      >
                        {new Date(s.starts_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        –
                        {new Date(s.ends_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {s.label ? ` ${s.label}` : ''}
                        {pending ? ' (attente)' : ''}
                        <Button
                          size="small"
                          sx={{ color: 'inherit', minWidth: 0, p: 0, ml: 0.5 }}
                          onClick={async () => {
                            if (!window.confirm('Supprimer cette vacation ?')) return;
                            await deleteShift(s.id);
                            await refresh();
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
          <TextField
            type="date"
            label="Du"
            InputLabelProps={{ shrink: true }}
            value={leaveForm?.starts_on ?? ''}
            onChange={(e) => setLeaveForm({ ...leaveForm!, starts_on: e.target.value })}
            fullWidth
          />
          <TextField
            type="date"
            label="Au"
            InputLabelProps={{ shrink: true }}
            value={leaveForm?.ends_on ?? ''}
            onChange={(e) => setLeaveForm({ ...leaveForm!, ends_on: e.target.value })}
            fullWidth
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
          <TextField
            type="datetime-local"
            label="Début"
            InputLabelProps={{ shrink: true }}
            value={form?.starts_at || ''}
            onChange={(e) => setForm({ ...form!, starts_at: e.target.value })}
            fullWidth
          />
          <TextField
            type="datetime-local"
            label="Fin"
            InputLabelProps={{ shrink: true }}
            value={form?.ends_at || ''}
            onChange={(e) => setForm({ ...form!, ends_at: e.target.value })}
            fullWidth
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
              helperText="Une seule confirmation employé couvre toute la série récurrente."
            >
              <MenuItem value="once">Une seule fois</MenuItem>
              <MenuItem value="daily">Tous les jours</MenuItem>
              <MenuItem value="weekly">Toutes les semaines</MenuItem>
              <MenuItem value="monthly">Tous les mois</MenuItem>
              <MenuItem value="yearly">Tous les ans</MenuItem>
            </TextField>
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
            <Button
              color="error"
              sx={{ mr: 'auto' }}
              onClick={async () => {
                if (!form.id || !window.confirm('Supprimer cette vacation ?')) return;
                await deleteShift(form.id);
                setOpen(false);
                setForm(null);
                await refresh();
              }}
            >
              Supprimer
            </Button>
          )}
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!form?.user_id) return;
              const payload = {
                user_id: form.user_id,
                starts_at: new Date(form.starts_at).toISOString(),
                ends_at: new Date(form.ends_at).toISOString(),
                label: form.label || undefined,
              };
              try {
                if (form.id) {
                  await updateShift(form.id, payload);
                } else {
                  const created = await createShift({
                    ...payload,
                    recurrence: form.recurrence || 'once',
                  });
                  const count = created.created_count || 1;
                  const pendingMsg = created.confirmation_pending
                    ? ' Un e-mail de confirmation a été envoyé à l’employé.'
                    : '';
                  alert(
                    count > 1
                      ? `${count} vacations créées (série).${pendingMsg}`
                      : `Vacation créée.${pendingMsg}`
                  );
                }
                setOpen(false);
                setForm(null);
                await refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Enregistrement impossible');
              }
            }}
          >
            {form?.id ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlanningPanel;
