import React, { useEffect, useState } from 'react';
import { Stack, TextField } from '@mui/material';
import {
  frenchDateToYmd,
  normalizeTimeHm,
  ymdToFrench,
} from '../../utils/formatDate';

type CommonProps = {
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
};

function splitDateTimeLocal(value: string): { date: string; time: string } {
  if (!value) return { date: '', time: '' };
  const [ymd, hm] = value.split('T');
  return {
    date: ymd ? ymdToFrench(ymd) : '',
    time: hm ? hm.slice(0, 5) : '',
  };
}

function joinDateTimeLocal(dateFr: string, time: string): string {
  const ymd = frenchDateToYmd(dateFr);
  const hm = normalizeTimeHm(time);
  if (!ymd || !hm) return '';
  return `${ymd}T${hm}`;
}

export const ParisDateTimeField: React.FC<
  CommonProps & {
    value: string;
    onChange: (next: string) => void;
    dateLabel?: string;
    timeLabel?: string;
  }
> = ({
  value,
  onChange,
  dateLabel = 'Date (jj/mm/aaaa)',
  timeLabel = 'Heure (HH:mm)',
  disabled,
  required,
  fullWidth = true,
  size,
}) => {
  const parsed = splitDateTimeLocal(value);
  const [dateText, setDateText] = useState(parsed.date);
  const [timeText, setTimeText] = useState(parsed.time);

  useEffect(() => {
    const next = splitDateTimeLocal(value);
    setDateText(next.date);
    setTimeText(next.time);
  }, [value]);

  const commit = (nextDate: string, nextTime: string) => {
    const joined = joinDateTimeLocal(nextDate, nextTime);
    if (joined) onChange(joined);
  };

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: fullWidth ? '100%' : undefined }}>
      <TextField
        label={dateLabel}
        value={dateText}
        onChange={(e) => setDateText(e.target.value)}
        onBlur={() => commit(dateText, timeText)}
        placeholder="jj/mm/aaaa"
        disabled={disabled}
        required={required}
        fullWidth
        size={size}
        inputProps={{ inputMode: 'numeric', autoComplete: 'off' }}
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label={timeLabel}
        value={timeText}
        onChange={(e) => setTimeText(e.target.value)}
        onBlur={() => commit(dateText, timeText)}
        placeholder="23:00"
        disabled={disabled}
        required={required}
        size={size}
        sx={{ minWidth: 140 }}
        inputProps={{ inputMode: 'numeric', autoComplete: 'off' }}
        InputLabelProps={{ shrink: true }}
      />
    </Stack>
  );
};

export const ParisDateField: React.FC<
  CommonProps & {
    label?: string;
    value: string;
    onChange: (ymd: string) => void;
  }
> = ({
  label = 'Date (jj/mm/aaaa)',
  value,
  onChange,
  disabled,
  required,
  fullWidth = true,
  size,
}) => {
  const [text, setText] = useState(value ? ymdToFrench(value) : '');

  useEffect(() => {
    setText(value ? ymdToFrench(value) : '');
  }, [value]);

  return (
    <TextField
      label={label}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (!text.trim()) {
          onChange('');
          return;
        }
        const ymd = frenchDateToYmd(text);
        if (ymd) onChange(ymd);
        else setText(value ? ymdToFrench(value) : '');
      }}
      placeholder="jj/mm/aaaa"
      disabled={disabled}
      required={required}
      fullWidth={fullWidth}
      size={size}
      inputProps={{ inputMode: 'numeric', autoComplete: 'off' }}
      InputLabelProps={{ shrink: true }}
    />
  );
};

export const ParisTimeField: React.FC<
  CommonProps & {
    label?: string;
    value: string;
    onChange: (hm: string) => void;
    error?: boolean;
    helperText?: string;
  }
> = ({
  label = 'Heure (HH:mm)',
  value,
  onChange,
  disabled,
  required,
  fullWidth = true,
  size,
  error,
  helperText,
}) => {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  return (
    <TextField
      label={label}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const hm = normalizeTimeHm(text);
        if (hm) onChange(hm);
        else if (!text.trim()) onChange('');
        else setText(value);
      }}
      placeholder="23:00"
      disabled={disabled}
      required={required}
      fullWidth={fullWidth}
      size={size}
      error={error}
      helperText={helperText}
      inputProps={{ inputMode: 'numeric', autoComplete: 'off' }}
      InputLabelProps={{ shrink: true }}
    />
  );
};
