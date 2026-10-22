import React from 'react';
import {
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { TimeEntryDto, TimeHoursTotalDto } from '../../../services/api/adminSpace';
import TimeClockEntriesTable from './TimeClockEntriesTable';
import TimeClockPeriodControls from './TimeClockPeriodControls';
import { formatDecimalHoursFr, formatDuration, staffLabel } from './timeClockFormat';

type Props = {
  from: string;
  to: string;
  reportLoading: boolean;
  totals: TimeHoursTotalDto[];
  entries: TimeEntryDto[];
  onFromChange: (iso: string) => void;
  onToChange: (iso: string) => void;
  onRefresh: () => void;
  onEdit: (entry: TimeEntryDto) => void;
  onDelete: (id: number) => void;
};

const TimeClockHoursReport: React.FC<Props> = ({
  from,
  to,
  reportLoading,
  totals,
  entries,
  onFromChange,
  onToChange,
  onRefresh,
  onEdit,
  onDelete,
}) => (
  <Paper variant="outlined" sx={{ p: 2 }}>
    <Typography variant="h6" gutterBottom>
      Heures travaillées
    </Typography>
    <TimeClockPeriodControls
      from={from}
      to={to}
      reportLoading={reportLoading}
      onFromChange={onFromChange}
      onToChange={onToChange}
      onRefresh={onRefresh}
    />
    {reportLoading ? (
      <CircularProgress size={24} />
    ) : (
      <>
        <Table size="small" sx={{ mb: 3 }}>
          <TableHead>
            <TableRow>
              <TableCell>Employé</TableCell>
              <TableCell>Heures (base 100)</TableCell>
              <TableCell>Durée lue</TableCell>
              <TableCell>Pointages</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {totals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>Aucun pointage sur la période</TableCell>
              </TableRow>
            ) : (
              totals.map((t) => (
                <TableRow key={t.user_id}>
                  <TableCell>{staffLabel(t)}</TableCell>
                  <TableCell>{formatDecimalHoursFr(t.total_ms)}</TableCell>
                  <TableCell>{formatDuration(t.total_ms)}</TableCell>
                  <TableCell>{t.entry_count}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TimeClockEntriesTable entries={entries} onEdit={onEdit} onDelete={onDelete} />
      </>
    )}
  </Paper>
);

export default TimeClockHoursReport;
