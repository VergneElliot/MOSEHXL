/**
 * Hour (24) / minute (60) wheel dialog → HH:mm.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { ParisWheelColumn } from './ParisWheelColumn';
import {
  formatHm,
  hourOptions,
  minuteOptions,
  parseHmParts,
} from './parisWheelOptions';

export type ParisTimeWheelDialogProps = {
  open: boolean;
  initialHm: string;
  onClose: () => void;
  onConfirm: (hm: string) => void;
};

export const ParisTimeWheelDialog: React.FC<ParisTimeWheelDialogProps> = ({
  open,
  initialHm,
  onClose,
  onConfirm,
}) => {
  const hours = useMemo(() => hourOptions(), []);
  const minutes = useMemo(() => minuteOptions(), []);
  const seed = parseHmParts(initialHm) ?? { hour: 12, minute: 0 };
  const [hour, setHour] = useState(seed.hour);
  const [minute, setMinute] = useState(seed.minute);

  useEffect(() => {
    if (!open) return;
    const next = parseHmParts(initialHm) ?? { hour: 12, minute: 0 };
    setHour(next.hour);
    setMinute(next.minute);
  }, [open, initialHm]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Choisir une heure</DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ pt: 1 }}>
          <Stack spacing={0.5} sx={{ width: 96 }}>
            <Typography variant="caption" color="text.secondary" align="center">
              Heure
            </Typography>
            <ParisWheelColumn
              ariaLabel="Heure"
              options={hours.map((h) => Number(h))}
              value={hour}
              onChange={setHour}
              formatLabel={(h) => String(h).padStart(2, '0')}
            />
          </Stack>
          <Stack spacing={0.5} sx={{ width: 96 }}>
            <Typography variant="caption" color="text.secondary" align="center">
              Minute
            </Typography>
            <ParisWheelColumn
              ariaLabel="Minute"
              options={minutes.map((m) => Number(m))}
              value={minute}
              onChange={setMinute}
              formatLabel={(m) => String(m).padStart(2, '0')}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          variant="contained"
          onClick={() => {
            onConfirm(formatHm(hour, minute));
            onClose();
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};
