/**
 * Opening hours settings — 7-day open/closed + times for public booking.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Grid,
  Switch,
  TextField,
  Typography,
  MenuItem,
} from '@mui/material';
import { AccessTime as HoursIcon, Save as SaveIcon } from '@mui/icons-material';
import { apiService } from '../../../services/apiService';

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface DayHours {
  closed: boolean;
  open: string;
  close: string;
}

export interface OpeningHoursSettings {
  timezone?: string;
  weekly: Record<WeekdayKey, DayHours>;
}

const DAY_LABELS: { key: WeekdayKey; label: string }[] = [
  { key: 'mon', label: 'Lundi' },
  { key: 'tue', label: 'Mardi' },
  { key: 'wed', label: 'Mercredi' },
  { key: 'thu', label: 'Jeudi' },
  { key: 'fri', label: 'Vendredi' },
  { key: 'sat', label: 'Samedi' },
  { key: 'sun', label: 'Dimanche' },
];

const TIMEZONES = [
  { value: 'Europe/Paris', label: 'Europe/Paris' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'America/New_York', label: 'America/New_York' },
];

function defaultHours(): OpeningHoursSettings {
  const day = (closed = false): DayHours => ({
    closed,
    open: '11:00',
    close: '23:00',
  });
  return {
    timezone: 'Europe/Paris',
    weekly: {
      mon: day(),
      tue: day(),
      wed: day(),
      thu: day(),
      fri: day(),
      sat: day(),
      sun: day(true),
    },
  };
}

export const OpeningHoursSettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<OpeningHoursSettings>(defaultHours);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiService.get<{ settings: OpeningHoursSettings }>(
        '/settings/opening-hours'
      );
      if (data?.settings) setSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateDay = (key: WeekdayKey, patch: Partial<DayHours>) => {
    setSettings((prev) => ({
      ...prev,
      weekly: {
        ...prev.weekly,
        [key]: { ...prev.weekly[key], ...patch },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await apiService.put('/settings/opening-hours', { settings });
      setMessage('Plages de réservations enregistrées.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <HoursIcon color="primary" />
          <Typography variant="h6">Plages de réservations</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ces plages définissent les jours et heures auxquels les clients peuvent demander une
          réservation sur la page publique. Elles peuvent différer des horaires d’ouverture habituels
          du bar (par ex. ouverture exceptionnelle plus tôt pour un groupe).
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {message && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message}
          </Alert>
        )}

        <TextField
          select
          label="Fuseau horaire"
          value={settings.timezone || 'Europe/Paris'}
          onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
          disabled={loading || saving}
          fullWidth
          sx={{ mb: 2, maxWidth: 360 }}
        >
          {TIMEZONES.map((tz) => (
            <MenuItem key={tz.value} value={tz.value}>
              {tz.label}
            </MenuItem>
          ))}
        </TextField>

        <Grid container spacing={2}>
          {DAY_LABELS.map(({ key, label }) => {
            const day = settings.weekly[key];
            return (
              <Grid item xs={12} key={key}>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    alignItems: 'center',
                    py: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography sx={{ minWidth: 100, fontWeight: 600 }}>{label}</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!day.closed}
                        onChange={(e) => updateDay(key, { closed: !e.target.checked })}
                        disabled={loading || saving}
                      />
                    }
                    label={day.closed ? 'Fermé' : 'Ouvert'}
                  />
                  <TextField
                    label="Ouverture"
                    type="time"
                    size="small"
                    value={day.open}
                    onChange={(e) => updateDay(key, { open: e.target.value })}
                    disabled={loading || saving || day.closed}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 140 }}
                  />
                  <TextField
                    label="Fermeture"
                    type="time"
                    size="small"
                    value={day.close}
                    onChange={(e) => updateDay(key, { close: e.target.value })}
                    disabled={loading || saving || day.closed}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 140 }}
                  />
                </Box>
              </Grid>
            );
          })}
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => void handleSave()}
            disabled={loading || saving}
          >
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default OpeningHoursSettingsPanel;
