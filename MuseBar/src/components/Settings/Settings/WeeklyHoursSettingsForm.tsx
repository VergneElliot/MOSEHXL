/**
 * Shared 7-day open/closed + time editor for reservation and operating hours.
 */

import React from 'react';
import {
  Box,
  FormControlLabel,
  Grid,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface DayHours {
  closed: boolean;
  open: string;
  close: string;
}

export interface WeeklyHoursSettings {
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

export function defaultWeeklyHours(closedSunday = true): WeeklyHoursSettings {
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
      sun: day(closedSunday),
    },
  };
}

interface WeeklyHoursSettingsFormProps {
  settings: WeeklyHoursSettings;
  onChange: (settings: WeeklyHoursSettings) => void;
  loading?: boolean;
  saving?: boolean;
  showTimezone?: boolean;
}

export const WeeklyHoursSettingsForm: React.FC<WeeklyHoursSettingsFormProps> = ({
  settings,
  onChange,
  loading = false,
  saving = false,
  showTimezone = true,
}) => {
  const updateDay = (key: WeekdayKey, patch: Partial<DayHours>) => {
    onChange({
      ...settings,
      weekly: {
        ...settings.weekly,
        [key]: { ...settings.weekly[key], ...patch },
      },
    });
  };

  return (
    <>
      {showTimezone && (
        <TextField
          select
          label="Fuseau horaire"
          value={settings.timezone || 'Europe/Paris'}
          onChange={(e) => onChange({ ...settings, timezone: e.target.value })}
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
      )}

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
    </>
  );
};

export default WeeklyHoursSettingsForm;
