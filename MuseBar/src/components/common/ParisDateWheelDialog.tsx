/**
 * Day / month-name / year wheel dialog → YMD string.
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
import { parisTodayYmd } from '../../utils/formatDate';
import { ParisWheelColumn } from './ParisWheelColumn';
import {
  MONTH_LABELS_FR,
  dayOptions,
  formatYmd,
  parseYmdParts,
  yearOptions,
  type MonthIndex,
} from './parisWheelOptions';

export type ParisDateWheelDialogProps = {
  open: boolean;
  initialYmd: string;
  onClose: () => void;
  onConfirm: (ymd: string) => void;
};

export const ParisDateWheelDialog: React.FC<ParisDateWheelDialogProps> = ({
  open,
  initialYmd,
  onClose,
  onConfirm,
}) => {
  const seed = parseYmdParts(initialYmd) ?? parseYmdParts(parisTodayYmd())!;
  const [year, setYear] = useState(seed.year);
  const [month, setMonth] = useState<MonthIndex>(seed.month);
  const [day, setDay] = useState(seed.day);

  useEffect(() => {
    if (!open) return;
    const next = parseYmdParts(initialYmd) ?? parseYmdParts(parisTodayYmd())!;
    setYear(next.year);
    setMonth(next.month);
    setDay(next.day);
  }, [open, initialYmd]);

  const days = useMemo(() => dayOptions(year, month), [year, month]);
  const years = useMemo(() => yearOptions(), []);

  useEffect(() => {
    if (!days.includes(day)) setDay(days[days.length - 1] ?? 1);
  }, [days, day]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Choisir une date</DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
          <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" align="center">
              Jour
            </Typography>
            <ParisWheelColumn
              ariaLabel="Jour"
              options={days}
              value={day}
              onChange={setDay}
            />
          </Stack>
          <Stack spacing={0.5} sx={{ flex: 1.4, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" align="center">
              Mois
            </Typography>
            <ParisWheelColumn
              ariaLabel="Mois"
              options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as MonthIndex[]}
              value={month}
              onChange={setMonth}
              formatLabel={(m) => MONTH_LABELS_FR[m - 1] ?? String(m)}
            />
          </Stack>
          <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" align="center">
              Année
            </Typography>
            <ParisWheelColumn
              ariaLabel="Année"
              options={years}
              value={year}
              onChange={setYear}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          variant="contained"
          onClick={() => {
            onConfirm(formatYmd(year, month, day));
            onClose();
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};
