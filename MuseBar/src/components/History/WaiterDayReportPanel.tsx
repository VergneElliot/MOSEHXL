import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { apiCore } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';

type WaiterDayReport = {
  date: string;
  period_start: string;
  period_end: string;
  closure_time: string;
  order_count: number;
  total_amount: number;
  waiters: Array<{
    waiter_user_id: number | null;
    waiter_display_name: string;
    order_count: number;
    total_amount: number;
  }>;
  note?: string;
};

const PARIS_SHORT = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : PARIS_SHORT.format(d);
}

/**
 * Non-fiscal CA par serveur for one business day (cut→cut).
 */
const WaiterDayReportPanel: React.FC = () => {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<WaiterDayReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (day: string) => {
    if (!day) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiCore.request<WaiterDayReport>(
        `/orders/waiter-day-report?date=${encodeURIComponent(day)}`,
        { method: 'GET' }
      );
      setReport(data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Impossible de charger le rapport');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(date);
  }, [date, load]);

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">CA par serveur</Typography>
        <TextField
          size="small"
          type="date"
          label="Journée commerciale"
          InputLabelProps={{ shrink: true }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Box>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Rapport informatif (pas un bulletin fiscal). Fenêtre selon l’heure de coupure des
        paramètres.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      {loading && <Typography variant="body2">Chargement…</Typography>}
      {!loading && report && (
        <>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Du <strong>{fmt(report.period_start)}</strong> au{' '}
            <strong>{fmt(report.period_end)}</strong> — {report.order_count} vente
            {report.order_count > 1 ? 's' : ''} — {formatCurrency(report.total_amount)}
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Serveur</TableCell>
                  <TableCell align="right">Ventes</TableCell>
                  <TableCell align="right">Montant</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.waiters.map((row) => (
                  <TableRow key={row.waiter_user_id ?? 'none'}>
                    <TableCell>{row.waiter_display_name}</TableCell>
                    <TableCell align="right">{row.order_count}</TableCell>
                    <TableCell align="right">{formatCurrency(row.total_amount)}</TableCell>
                  </TableRow>
                ))}
                {report.waiters.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>Aucune vente sur cette journée commerciale.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Paper>
  );
};

export default WaiterDayReportPanel;
