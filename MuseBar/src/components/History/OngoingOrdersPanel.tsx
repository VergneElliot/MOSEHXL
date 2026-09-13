import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Paper, Typography } from '@mui/material';
import {
  listOngoingOrders,
  setTicketItemFulfillment,
  type OngoingOrderDto,
} from '../../services/api/floorOngoingOrders';
import { useStepUpAuth } from '../../contexts/StepUpAuthContext';
import { useVisibleInterval } from '../../hooks/useVisibleInterval';
import OngoingOrderTableCard from './OngoingOrderTableCard';

const OngoingOrdersPanel: React.FC = () => {
  const { ensureSession } = useStepUpAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OngoingOrderDto[]>([]);
  const [advancingKey, setAdvancingKey] = useState<string | null>(null);

  const reload = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const data = await listOngoingOrders();
      setOrders(data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Impossible de charger les commandes en cours');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);
  useVisibleInterval(() => void reload({ silent: true }), 15000);

  const onAdvance = useCallback(
    async (
      ticketId: number,
      itemIds: number[],
      status: 'sent' | 'served',
      busyKey: string
    ) => {
      setAdvancingKey(busyKey);
      setActionError(null);
      try {
        const actor = await ensureSession({
          message: 'Saisissez votre PIN pour mettre à jour le statut de service.',
        });
        for (const itemId of itemIds) {
          await setTicketItemFulfillment(ticketId, itemId, status, actor.token);
        }
        await reload({ silent: true });
      } catch (err: unknown) {
        const e = err as { message?: string };
        if (e.message && /annul/i.test(e.message)) return;
        setActionError(e.message || 'Impossible de mettre à jour le statut');
      } finally {
        setAdvancingKey(null);
      }
    },
    [ensureSession, reload]
  );

  if (loading && orders.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (orders.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          Aucune commande en cours (tables sans articles validés).
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Suivi table par table après validation : Validé → Envoyé → Servi. Les chronos indiquent le
        temps passé dans le statut actuel.
      </Typography>
      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}
      {orders.map((order) => (
        <OngoingOrderTableCard
          key={order.ticket_id}
          order={order}
          advancingKey={advancingKey}
          onAdvance={onAdvance}
        />
      ))}
    </Box>
  );
};

export default OngoingOrdersPanel;
