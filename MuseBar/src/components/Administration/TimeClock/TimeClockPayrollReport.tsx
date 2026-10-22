import React from 'react';
import {
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { PayrollSummaryDto } from '../../../services/api/adminSpace';
import TimeClockPeriodControls from './TimeClockPeriodControls';
import { staffLabel } from './timeClockFormat';

type Props = {
  from: string;
  to: string;
  reportLoading: boolean;
  payroll: PayrollSummaryDto | null;
  onFromChange: (iso: string) => void;
  onToChange: (iso: string) => void;
  onRefresh: () => void;
};

const TimeClockPayrollReport: React.FC<Props> = ({
  from,
  to,
  reportLoading,
  payroll,
  onFromChange,
  onToChange,
  onRefresh,
}) => (
  <Paper variant="outlined" sx={{ p: 2 }}>
    <Typography variant="h6" gutterBottom>
      Synthèse pour le comptable
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Totaux à transmettre en fin de mois. Le comptable valide le caractère des congés payés,
      le solde CP (2,5 j/mois) et les heures supplémentaires.
    </Typography>
    <TimeClockPeriodControls
      from={from}
      to={to}
      reportLoading={reportLoading}
      payroll
      onFromChange={onFromChange}
      onToChange={onToChange}
      onRefresh={onRefresh}
    />
    {reportLoading ? (
      <CircularProgress size={24} />
    ) : !payroll ? (
      <Alert severity="info">Sélectionnez une période et actualisez.</Alert>
    ) : (
      <>
        {payroll.notes.map((note) => (
          <Typography key={note} variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>
            • {note}
          </Typography>
        ))}
        <Table size="small" sx={{ mt: 2, mb: 3 }}>
          <TableHead>
            <TableRow>
              <TableCell>Employé</TableCell>
              <TableCell>Heures (centièmes)</TableCell>
              <TableCell>Repas</TableCell>
              <TableCell>Jours CP</TableCell>
              <TableCell>Jours RTT</TableCell>
              <TableCell>Autres abs.</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payroll.employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>Aucune donnée sur la période</TableCell>
              </TableRow>
            ) : (
              payroll.employees.map((e) => (
                <TableRow key={e.user_id}>
                  <TableCell>
                    {staffLabel({
                      first_name: e.first_name,
                      last_name: e.last_name,
                      email: e.email,
                    })}
                  </TableCell>
                  <TableCell>{e.hours_formatted}</TableCell>
                  <TableCell>{e.meals}</TableCell>
                  <TableCell>{e.paid_leave_days > 0 ? e.paid_leave_days : '—'}</TableCell>
                  <TableCell>{e.rtt_days > 0 ? e.rtt_days : '—'}</TableCell>
                  <TableCell>{e.other_leave_days > 0 ? e.other_leave_days : '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {payroll.employees.some((e) => e.leave_lines.length > 0) && (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Détail congés (jours ouverts de l&apos;établissement jusqu&apos;au jour de reprise)
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Employé</TableCell>
                  <TableCell>Demande</TableCell>
                  <TableCell>Compté du → au</TableCell>
                  <TableCell>Reprise</TableCell>
                  <TableCell>Jours</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payroll.employees.flatMap((e) =>
                  e.leave_lines.map((l) => (
                    <TableRow key={`${e.user_id}-${l.leave_id}`}>
                      <TableCell>
                        {staffLabel({
                          first_name: e.first_name,
                          last_name: e.last_name,
                          email: e.email,
                        })}
                      </TableCell>
                      <TableCell>
                        {l.requested_from} → {l.requested_to}
                      </TableCell>
                      <TableCell>
                        {l.count_from} → {l.count_through}
                      </TableCell>
                      <TableCell>{l.return_on}</TableCell>
                      <TableCell>{l.counted_days}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </>
        )}
      </>
    )}
  </Paper>
);

export default TimeClockPayrollReport;
