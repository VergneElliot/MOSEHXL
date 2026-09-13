import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import * as floorApi from '../../services/api/floor';
import { formatCurrency } from '../../utils/formatCurrency';
import { summarizeResumeDisplay } from './tableResumeDisplay';
import { elapsedSince, type ResumeTicketItem } from './tableResumeTimers';
import TableResumeLinesList from './TableResumeLinesList';
import { useElapsedTick } from './useElapsedTick';
import { tableHasActiveOrder } from './tableOccupancy';

export interface TableResumeDialogProps {
  open: boolean;
  table: floorApi.DiningTableStatusDto | null;
  onClose: () => void;
  onOpenInPos: (table: floorApi.DiningTableStatusDto) => void;
}

const TableResumeDialog: React.FC<TableResumeDialogProps> = ({
  open,
  table,
  onClose,
  onOpenInPos,
}) => {
  const now = useElapsedTick(30_000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<floorApi.OpenTicketDto | null>(null);
  const [items, setItems] = useState<ResumeTicketItem[]>([]);
  const [waiterName, setWaiterName] = useState<string | null>(null);

  const ticketId = table?.open_ticket_id ?? null;
  const statusSaysFree = table == null || !tableHasActiveOrder(table);

  useEffect(() => {
    if (!open || table == null) return;
    if (statusSaysFree || ticketId == null) {
      setTicket(null);
      setItems([]);
      setWaiterName(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void floorApi
      .getTicket(ticketId)
      .then((res) => {
        if (cancelled) return;
        setTicket(res.ticket);
        setItems(res.items as ResumeTicketItem[]);
        setWaiterName(res.served_by_display_name ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const e = err as { message?: string };
        setError(e.message || 'Impossible de charger l’addition');
        setTicket(null);
        setItems([]);
        setWaiterName(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, table, ticketId, statusSaysFree]);

  const summary = summarizeResumeDisplay(items);
  const isFree = statusSaysFree || (!loading && !error && items.length === 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Table {table?.label ?? ''}
        {ticket?.covers != null && ticket.covers > 0 ? (
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            · {ticket.covers} couvert{ticket.covers > 1 ? 's' : ''}
          </Typography>
        ) : null}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : isFree ? (
          <Alert severity="info">Table libre — aucune addition ouverte.</Alert>
        ) : (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              Serveur : {waiterName || '—'}
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Typography variant="body2">
                Ouverte depuis {elapsedSince(ticket?.created_at, now)}
              </Typography>
              <Typography variant="body2">
                Dernière activité {elapsedSince(ticket?.updated_at, now)}
              </Typography>
            </Stack>
            <Divider />
            <TableResumeLinesList items={items} nowMs={now} />
            <Divider />
            <Typography variant="body2">
              {summary.draftCount} non validé(s) · {summary.validatedCount} validé(s) ·{' '}
              {summary.sentCount} envoyé(s) · {summary.servedCount} servi(s) · Total TTC{' '}
              {formatCurrency(summary.activeTotalTtc)}
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        <Button
          variant="contained"
          disabled={table == null || Boolean(error)}
          onClick={() => {
            if (table) onOpenInPos(table);
          }}
        >
          Ouvrir en caisse
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TableResumeDialog;
