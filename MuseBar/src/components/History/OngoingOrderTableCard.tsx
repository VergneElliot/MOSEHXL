import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { OngoingOrderDto } from '../../services/api/floorOngoingOrders';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import {
  fulfillmentAgeLabel,
  fulfillmentColor,
  fulfillmentLabel,
  nextFulfillmentAction,
} from './ongoingOrderFulfillmentUi';
import { formatOngoingQty, groupOngoingItems } from './ongoingOrderGroupLines';

type Props = {
  order: OngoingOrderDto;
  advancingKey: string | null;
  onAdvance: (
    ticketId: number,
    itemIds: number[],
    status: 'sent' | 'served',
    busyKey: string
  ) => void;
};

const OngoingOrderTableCard: React.FC<Props> = ({ order, advancingKey, onAdvance }) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const grouped = groupOngoingItems(order.items);

  return (
    <Box component="section" sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
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
            color="success"
            variant="outlined"
            label={`${order.validated_line_count} validé(s)`}
          />
          <Chip
            size="small"
            color="info"
            variant="outlined"
            label={`${order.sent_line_count} envoyé(s)`}
          />
          <Chip
            size="small"
            color="secondary"
            variant="outlined"
            label={`${order.served_line_count} servi(s)`}
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
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {grouped.map((line) => {
              const next = nextFulfillmentAction(line.fulfillment_status);
              const key = `${order.ticket_id}:group:${line.key}`;
              const busy = advancingKey === key;
              return (
                <TableRow key={line.key}>
                  <TableCell>
                    {formatOngoingQty(line.quantity)} {line.product_name}
                  </TableCell>
                  <TableCell align="right">{Math.round(line.quantity)}</TableCell>
                  <TableCell align="right">{formatCurrency(line.total_price)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      <Chip
                        size="small"
                        label={fulfillmentLabel(line.fulfillment_status)}
                        color={fulfillmentColor(line.fulfillment_status)}
                        variant="outlined"
                        sx={{ alignSelf: 'flex-start' }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {fulfillmentAgeLabel(line.ageItem, nowMs)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {next ? (
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={busy}
                        onClick={() => onAdvance(order.ticket_id, line.itemIds, next.target, key)}
                        startIcon={busy ? <CircularProgress size={14} /> : undefined}
                      >
                        {next.label}
                      </Button>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default OngoingOrderTableCard;
