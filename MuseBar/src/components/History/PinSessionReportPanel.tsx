import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  generatePinSessionReport,
  listPinSessionsByDay,
  type PinSessionDayRow,
  type PinSessionReportSnapshot,
} from '../../services/api/pinSessionReports';
import { formatCurrency } from '../../utils/formatCurrency';
import { parisTodayYmd } from '../../utils/formatDate';
import { ParisDateField } from '../common/ParisDateTimeField';
import { printPinSessionReport } from './pinSessionReportPrint';

const PARIS_SHORT = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : PARIS_SHORT.format(d);
}

/** Non-fiscal PIN session sheets — generate + browser print from History. */
const PinSessionReportPanel: React.FC = () => {
  const [date, setDate] = useState(() => parisTodayYmd());
  const [sessions, setSessions] = useState<PinSessionDayRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lastSnap, setLastSnap] = useState<PinSessionReportSnapshot | null>(null);

  const load = useCallback(async (day: string) => {
    if (!day) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listPinSessionsByDay(day);
      setSessions(data.sessions);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Impossible de charger les sessions');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(date);
  }, [date, load]);

  const handleGenerate = async (sessionId: string) => {
    setBusyId(sessionId);
    setError(null);
    try {
      const report = await generatePinSessionReport(sessionId);
      setLastSnap(report.snapshot);
      printPinSessionReport(report.snapshot);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Génération impossible');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">Rapports de session PIN</Typography>
        <ParisDateField
          size="small"
          label="Journée commerciale (jj/mm/aaaa)"
          value={date}
          onChange={setDate}
          fullWidth={false}
        />
      </Box>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Rapport informatif (pas un bulletin fiscal). Générez et imprimez le CA d’une session
        badge — indépendamment de la fermeture du badge.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      {loading && <Typography variant="body2">Chargement…</Typography>}
      {!loading && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Serveur</TableCell>
                <TableCell>Ouverture</TableCell>
                <TableCell>Fermeture</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.display_name}</TableCell>
                  <TableCell>{fmt(s.opened_at)}</TableCell>
                  <TableCell>
                    {s.closed_at ? fmt(s.closed_at) : <em>Ouverte</em>}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={busyId === s.id}
                      onClick={() => void handleGenerate(s.id)}
                      startIcon={
                        busyId === s.id ? <CircularProgress size={14} /> : undefined
                      }
                    >
                      Générer / Imprimer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>Aucune session PIN sur cette journée.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {lastSnap && (
        <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
          Dernier rapport : {lastSnap.staff_display_name} — {lastSnap.order_count} vente
          {lastSnap.order_count > 1 ? 's' : ''} — {formatCurrency(lastSnap.total_amount)}
        </Typography>
      )}
    </Paper>
  );
};

export default PinSessionReportPanel;
