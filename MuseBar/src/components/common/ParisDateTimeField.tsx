import React, { useEffect, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { normalizeTimeHm } from '../../utils/formatDate';
import { ParisDateField } from './ParisDateField';
import { ParisTimeField } from './ParisTimeField';

export { ParisDateField } from './ParisDateField';
export { ParisTimeField } from './ParisTimeField';

type CommonProps = {
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
};

function splitDateTimeLocal(value: string): { dateYmd: string; time: string } {
  if (!value) return { dateYmd: '', time: '' };
  const [ymd, hm] = value.split('T');
  return {
    dateYmd: ymd ?? '',
    time: hm ? hm.slice(0, 5) : '',
  };
}

function joinDateTimeLocal(ymd: string, time: string): string {
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
  const [dateYmd, setDateYmd] = useState(parsed.dateYmd);
  const [timeHm, setTimeHm] = useState(parsed.time);

  useEffect(() => {
    const next = splitDateTimeLocal(value);
    setDateYmd(next.dateYmd);
    setTimeHm(next.time);
  }, [value]);

  const commit = (nextYmd: string, nextHm: string) => {
    const joined = joinDateTimeLocal(nextYmd, nextHm);
    if (joined) onChange(joined);
  };

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      sx={{ width: fullWidth ? '100%' : undefined }}
    >
      <ParisDateField
        label={dateLabel}
        value={dateYmd}
        onChange={(ymd) => {
          setDateYmd(ymd);
          commit(ymd, timeHm);
        }}
        disabled={disabled}
        required={required}
        fullWidth
        size={size}
      />
      <Box sx={{ minWidth: 160, flexShrink: 0 }}>
        <ParisTimeField
          label={timeLabel}
          value={timeHm}
          onChange={(hm) => {
            setTimeHm(hm);
            commit(dateYmd, hm);
          }}
          disabled={disabled}
          required={required}
          fullWidth
          size={size}
        />
      </Box>
    </Stack>
  );
};
