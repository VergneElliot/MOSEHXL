import React, { useEffect, useState } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import { Schedule as ClockIcon } from '@mui/icons-material';
import { normalizeTimeHm } from '../../utils/formatDate';
import { ParisTimeWheelDialog } from './ParisTimeWheelDialog';

type CommonProps = {
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
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
  const [wheelOpen, setWheelOpen] = useState(false);

  useEffect(() => {
    setText(value);
  }, [value]);

  return (
    <>
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
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                size="small"
                aria-label="Ouvrir le sélecteur d’heure"
                disabled={disabled}
                onClick={() => setWheelOpen(true)}
              >
                <ClockIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <ParisTimeWheelDialog
        open={wheelOpen}
        initialHm={normalizeTimeHm(text) || value || '12:00'}
        onClose={() => setWheelOpen(false)}
        onConfirm={(hm) => {
          onChange(hm);
          setText(hm);
        }}
      />
    </>
  );
};
