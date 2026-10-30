import React, { useEffect, useState } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import { CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { frenchDateToYmd, ymdToFrench } from '../../utils/formatDate';
import { ParisDateWheelDialog } from './ParisDateWheelDialog';

type CommonProps = {
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
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
  const [wheelOpen, setWheelOpen] = useState(false);

  useEffect(() => {
    setText(value ? ymdToFrench(value) : '');
  }, [value]);

  const commitText = () => {
    if (!text.trim()) {
      onChange('');
      return;
    }
    const ymd = frenchDateToYmd(text);
    if (ymd) onChange(ymd);
    else setText(value ? ymdToFrench(value) : '');
  };

  return (
    <>
      <TextField
        label={label}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commitText}
        placeholder="jj/mm/aaaa"
        disabled={disabled}
        required={required}
        fullWidth={fullWidth}
        size={size}
        inputProps={{ inputMode: 'numeric', autoComplete: 'off' }}
        InputLabelProps={{ shrink: true }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                size="small"
                aria-label="Ouvrir le sélecteur de date"
                disabled={disabled}
                onClick={() => setWheelOpen(true)}
              >
                <CalendarIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <ParisDateWheelDialog
        open={wheelOpen}
        initialYmd={value || frenchDateToYmd(text) || ''}
        onClose={() => setWheelOpen(false)}
        onConfirm={(ymd) => {
          onChange(ymd);
          setText(ymdToFrench(ymd));
        }}
      />
    </>
  );
};
