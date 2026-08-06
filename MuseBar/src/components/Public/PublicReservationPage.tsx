/**
 * Public reservation booking page — /reserve/:slug (no login).
 * FR date display + 24h time slots limited to opening hours.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { apiConfig } from '../../config/api';
import AdminMonthCalendar, {
  addMonths,
  startOfMonth,
} from '../Administration/AdminMonthCalendar';

interface DayHours {
  closed: boolean;
  open: string;
  close: string;
}

interface PublicBookingInfo {
  establishment: { name: string; slug: string };
  opening_hours: {
    timezone?: string;
    weekly: Record<string, DayHours>;
  };
  opening_hours_configured: boolean;
  closed_dates?: string[];
}

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDayFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Build 30-min slots within open–close (supports overnight). */
function buildOpenTimeSlots(day: DayHours, stepMin = 30): string[] {
  if (day.closed) return [];
  const openM = timeToMinutes(day.open);
  const closeM = timeToMinutes(day.close);
  const slots: string[] = [];
  if (closeM > openM) {
    for (let m = openM; m < closeM; m += stepMin) {
      slots.push(minutesToTime(m));
    }
  } else {
    for (let m = openM; m < 24 * 60; m += stepMin) {
      slots.push(minutesToTime(m));
    }
    for (let m = 0; m < closeM; m += stepMin) {
      slots.push(minutesToTime(m));
    }
  }
  return slots;
}

function formatDateFr(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const PublicReservationPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const [info, setInfo] = useState<PublicBookingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    party_size: 2,
    notes: '',
    website: '',
  });

  const todayStart = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const isDayBookable = useCallback(
    (day: Date) => {
      if (!info) return false;
      const d = new Date(day);
      d.setHours(0, 0, 0, 0);
      if (d < todayStart) return false;
      const dk = dateKey(d);
      if ((info.closed_dates || []).includes(dk)) return false;
      const key = WEEKDAY_KEYS[d.getDay()]!;
      const hours = info.opening_hours.weekly[key];
      return Boolean(hours && !hours.closed);
    },
    [info, todayStart]
  );

  const timeSlots = useMemo(() => {
    if (!selectedDayKey || !info) return [];
    if ((info.closed_dates || []).includes(selectedDayKey)) return [];
    const day = parseDayFromKey(selectedDayKey);
    const key = WEEKDAY_KEYS[day.getDay()]!;
    const hours = info.opening_hours.weekly[key];
    if (!hours || hours.closed) return [];
    return buildOpenTimeSlots(hours, 30);
  }, [selectedDayKey, info]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!apiConfig.isReady()) await apiConfig.initialize();
      const res = await fetch(
        apiConfig.getEndpoint(`/api/public/reservations/${encodeURIComponent(slug)}`)
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const errObj = (body as { error?: string | { message?: string } }).error;
        const msg =
          typeof errObj === 'string'
            ? errObj
            : errObj?.message || `Erreur ${res.status}`;
        throw new Error(msg);
      }
      const data = (await res.json()) as PublicBookingInfo;
      setInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDayClick = (day: Date) => {
    if (!isDayBookable(day)) return;
    const key = dateKey(day);
    const wd = WEEKDAY_KEYS[day.getDay()]!;
    const hours = info?.opening_hours.weekly[wd];
    const slots = hours && !hours.closed ? buildOpenTimeSlots(hours, 30) : [];
    setSelectedDayKey(key);
    setSelectedTime(slots[0] || '');
    setSuccess(false);
    setOpen(true);
  };

  const submit = async () => {
    if (!selectedDayKey || !selectedTime) return;
    setSubmitting(true);
    setError(null);
    try {
      if (!apiConfig.isReady()) await apiConfig.initialize();
      const [y, mo, d] = selectedDayKey.split('-').map(Number);
      const [hh, mm] = selectedTime.split(':').map(Number);
      const local = new Date(y!, mo! - 1, d!, hh || 0, mm || 0, 0, 0);
      const startsAt = local.toISOString();
      const res = await fetch(
        apiConfig.getEndpoint(`/api/public/reservations/${encodeURIComponent(slug)}`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: form.customer_name,
            customer_email: form.customer_email,
            customer_phone: form.customer_phone,
            party_size: Number(form.party_size),
            starts_at: startsAt,
            notes: form.notes || undefined,
            website: form.website,
          }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errObj = (body as { error?: string | { message?: string } }).error;
        const msg =
          typeof errObj === 'string'
            ? errObj
            : errObj?.message || `Erreur ${res.status}`;
        throw new Error(msg);
      }
      setSuccess(true);
      setOpen(false);
      setForm({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        party_size: 2,
        notes: '',
        website: '',
      });
      setSelectedDayKey('');
      setSelectedTime('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  const selectedDayLabel = selectedDayKey
    ? formatDateFr(parseDayFromKey(selectedDayKey))
    : '';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(165deg, #0f172a 0%, #1e293b 45%, #334155 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Typography
          variant="h3"
          sx={{
            color: '#f8fafc',
            fontFamily: '"Fraunces", "Georgia", serif',
            fontWeight: 600,
            mb: 1,
          }}
        >
          {info?.establishment.name || 'Réservation'}
        </Typography>
        <Typography sx={{ color: '#cbd5e1', mb: 3 }}>
          Choisissez un jour ouvert, puis indiquez vos coordonnées. Vous recevrez une confirmation
          par e-mail.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
            Demande envoyée. Vous recevrez un e-mail de confirmation de la part de l’établissement.
          </Alert>
        )}
        {!info && !error && (
          <Alert severity="warning">Établissement introuvable.</Alert>
        )}

        {info && (
          <Box
            sx={{
              bgcolor: 'rgba(248,250,252,0.96)',
              borderRadius: 2,
              p: 2,
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            }}
          >
            <AdminMonthCalendar
              month={month}
              onMonthChange={setMonth}
              items={[]}
              onDayClick={onDayClick}
              dayDisabled={(day) => !isDayBookable(day)}
              hideFooterHint
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Seuls les jours ouverts (selon les horaires) sont sélectionnables. Aucune limite
              d’anticipation.
            </Typography>
          </Box>
        )}
      </Container>

      <Dialog open={open} onClose={() => !submitting && setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Demande de réservation</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Date"
            value={selectedDayLabel}
            fullWidth
            InputProps={{ readOnly: true }}
            helperText="Format français (jour / mois / année)"
          />
          <TextField
            select
            label="Heure"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            fullWidth
            required
            helperText="Horaires d’ouverture uniquement (24 h)"
          >
            {timeSlots.length === 0 ? (
              <MenuItem value="" disabled>
                Aucun créneau
              </MenuItem>
            ) : (
              timeSlots.map((t) => (
                <MenuItem key={t} value={t}>
                  {t.replace(':', ' h ')}
                </MenuItem>
              ))
            )}
          </TextField>
          <TextField
            label="Nombre de personnes"
            type="number"
            inputProps={{ min: 1, max: 200 }}
            value={form.party_size}
            onChange={(e) => setForm({ ...form, party_size: Number(e.target.value) })}
            fullWidth
            required
          />
          <TextField
            label="Nom"
            value={form.customer_name}
            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Email"
            type="email"
            value={form.customer_email}
            onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Téléphone"
            value={form.customer_phone}
            onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Notes (optionnel)"
            multiline
            minRows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            fullWidth
          />
          <TextField
            label="Website"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            sx={{ position: 'absolute', left: -9999, opacity: 0, height: 0, width: 0 }}
            tabIndex={-1}
            autoComplete="off"
            inputProps={{ 'aria-hidden': true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button
            variant="contained"
            disabled={
              submitting ||
              !form.customer_name ||
              !form.customer_email ||
              !form.customer_phone ||
              !selectedDayKey ||
              !selectedTime
            }
            onClick={() => void submit()}
          >
            {submitting ? 'Envoi…' : 'Envoyer la demande'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PublicReservationPage;
