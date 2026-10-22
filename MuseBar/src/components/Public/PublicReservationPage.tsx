/**
 * Public reservation booking page — /reserve/:slug (no login).
 * FR date display + 24h time slots limited to opening hours.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress, Container, Typography } from '@mui/material';
import { apiConfig } from '../../config/api';
import AdminMonthCalendar, { startOfMonth } from '../Administration/AdminMonthCalendar';
import { parisYmdHmToUtcIso } from '../../utils/formatDate';
import PublicReservationAlerts from './PublicReservationAlerts';
import PublicReservationFormDialog from './PublicReservationFormDialog';
import {
  dateKey,
  emptyPublicReservationForm,
  formatDateFr,
  isDayBookable,
  parseDayFromKey,
  readPublicApiError,
  slotsForCalendarDay,
  timeSlotsForDay,
  type PublicBookingInfo,
  type PublicReservationForm,
} from './publicReservationHours';

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
  const [form, setForm] = useState<PublicReservationForm>(emptyPublicReservationForm);

  const todayStart = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const timeSlots = useMemo(
    () => (info ? timeSlotsForDay(info, selectedDayKey) : []),
    [selectedDayKey, info]
  );

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
        throw new Error(readPublicApiError(body, res.status));
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
    if (!info || !isDayBookable(day, info, todayStart)) return;
    const key = dateKey(day);
    const slots = slotsForCalendarDay(info, day);
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
      const startsAt = parisYmdHmToUtcIso(selectedDayKey, selectedTime);
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
        throw new Error(readPublicApiError(body, res.status));
      }
      setSuccess(true);
      setOpen(false);
      setForm(emptyPublicReservationForm);
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

  const selectedDayLabel = selectedDayKey ? formatDateFr(parseDayFromKey(selectedDayKey)) : '';

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

        <PublicReservationAlerts
          error={error}
          success={success}
          missingEstablishment={!info && !error}
          onClearError={() => setError(null)}
          onClearSuccess={() => setSuccess(false)}
        />

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
              dayDisabled={(day) => !isDayBookable(day, info, todayStart)}
              hideFooterHint
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Seuls les jours ouverts (selon les horaires) sont sélectionnables. Aucune limite
              d’anticipation.
            </Typography>
          </Box>
        )}
      </Container>

      <PublicReservationFormDialog
        open={open}
        submitting={submitting}
        selectedDayLabel={selectedDayLabel}
        selectedTime={selectedTime}
        timeSlots={timeSlots}
        form={form}
        selectedDayKey={selectedDayKey}
        onClose={() => setOpen(false)}
        onTimeChange={setSelectedTime}
        onFormChange={setForm}
        onSubmit={() => void submit()}
      />
    </Box>
  );
};

export default PublicReservationPage;
