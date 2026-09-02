import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { listOngoingOrders, type OngoingOrderDto } from '../../services/api/floor';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

function fulfillmentLabel(status: OngoingOrderDto['items'][0]['fulfillment_status']): string {
  switch (status) {
    case 'pending_validation':
      return 'En attente validation';
    case 'kitchen_sent':
      return 'Envoyé cuisine';
    case 'validated':
      return 'Validé';
    default:
      return status;
  }
}

function fulfillmentColor(
  status: OngoingOrderDto['items'][0]['fulfillment_status']
): 'default' | 'warning' | 'info' | 'success' {
  switch (status) {
    case 'pending_validation':
      return 'warning';
    case 'kitchen_sent':
      return 'info';
    case 'validated':
      return 'success';
    default:
      return 'default';
  }
}

const OngoingOrdersPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OngoingOrderDto[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listOngoingOrders();
      setOrders(data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Impossible de charger les commandes en cours');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const t = window.setInterval(() => void reload(), 15000);
    return () => window.clearInterval(t);
  }, [reload]);

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
          Aucune commande en cours (tables sans articles validés ou en attente).
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Tables avec articles en attente de validation ou déjà validés (service en cours). Les statuts
        « Envoyé » / « Servi » seront affinés avec le plan de salle.
      </Typography>
      {orders.map((order) => (
        <Paper key={order.ticket_id} variant="outlined" sx={{ overflow: 'hidden' }}>
          <Box
            sx={{
              px: 2,
              py: 1.25,
              bgcolor: 'action.hover',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Table {order.table_label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ticket #{order.ticket_id} · MAJ {formatDate(order.updated_at)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              {order.waiter_display_name && (
                <Chip size="small" label={`Serveur : ${order.waiter_display_name}`} />
              )}
              <Chip
                size="small"
                color="warning"
                variant="outlined"
                label={`${order.draft_line_count} en attente`}
              />
              <Chip
                size="small"
                color="success"
                variant="outlined"
                label={`${order.validated_line_count} validé(s)`}
              />
              <Typography variant="body2" fontWeight={700}>
                {formatCurrency(order.total_amount)}
              </Typography>
            </Box>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Article</TableCell>
                  <TableCell align="right">Qté</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">{formatCurrency(item.total_price)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={fulfillmentLabel(item.fulfillment_status)}
                        color={fulfillmentColor(item.fulfillment_status)}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}
    </Box>
  );
};

export default OngoingOrdersPanel;
