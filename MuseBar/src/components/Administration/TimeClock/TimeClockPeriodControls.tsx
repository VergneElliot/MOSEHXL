import React from 'react';
import { Box, Button } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { ParisDateTimeField } from '../../common/ParisDateTimeField';
import { downloadAccountantExport } from '../../../services/api/adminSpace';
import {
  endOfMonthIso,
  endOfWeekIso,
  startOfMonthIso,
  startOfWeekIso,
} from '../timeClockPanelDates';
import { fromLocalInputValue, toLocalInputValue } from './timeClockFormat';

type Props = {
  from: string;
  to: string;
  reportLoading: boolean;
  payroll?: boolean;
  onFromChange: (iso: string) => void;
  onToChange: (iso: string) => void;
  onRefresh: () => void;
};

const TimeClockPeriodControls: React.FC<Props> = ({
  from,
  to,
  reportLoading,
  payroll,
  onFromChange,
  onToChange,
  onRefresh,
}) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
    <Button
      size="small"
      variant="text"
      onClick={() => {
        onFromChange(startOfWeekIso());
        onToChange(endOfWeekIso());
      }}
    >
      Cette semaine
    </Button>
    <Button
      size="small"
      variant="text"
      onClick={() => {
        onFromChange(startOfMonthIso());
        onToChange(endOfMonthIso());
      }}
    >
      Ce mois
    </Button>
    <ParisDateTimeField
      dateLabel="Du (jj/mm/aaaa)"
      timeLabel="Heure"
      size="small"
      value={toLocalInputValue(from)}
      onChange={(next) => onFromChange(fromLocalInputValue(next))}
    />
    <ParisDateTimeField
      dateLabel="Au (jj/mm/aaaa)"
      timeLabel="Heure"
      size="small"
      value={toLocalInputValue(to)}
      onChange={(next) => onToChange(fromLocalInputValue(next))}
    />
    <Button variant="outlined" onClick={onRefresh} disabled={reportLoading}>
      Actualiser
    </Button>
    {payroll && (
      <Button
        variant="contained"
        startIcon={<DownloadIcon />}
        onClick={() => void downloadAccountantExport(from, to)}
      >
        Export comptable (CSV)
      </Button>
    )}
  </Box>
);

export default TimeClockPeriodControls;
