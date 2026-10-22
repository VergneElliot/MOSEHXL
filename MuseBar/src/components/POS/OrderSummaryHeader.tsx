import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import {
  Clear as ClearIcon,
  TableRestaurant as TableIcon,
} from '@mui/icons-material';

interface OrderSummaryHeaderProps {
  activeTableLabel?: string | null;
  assignedWaiterDisplayName?: string | null;
  clearActionTitle: string;
  clearActionDisabled: boolean;
  onClearOrder: () => void;
}

const OrderSummaryHeader: React.FC<OrderSummaryHeaderProps> = ({
  activeTableLabel = null,
  assignedWaiterDisplayName = null,
  clearActionTitle,
  clearActionDisabled,
  onClearOrder,
}) => (
  <Box
    sx={{ flexShrink: 0 }}
    display="flex"
    justifyContent="space-between"
    alignItems="flex-start"
    mb={0.25}
  >
    <Box>
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
        Commande
      </Typography>
      {activeTableLabel ? (
        <Box>
          <Typography
            variant="caption"
            color="secondary.main"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}
          >
            <TableIcon sx={{ fontSize: 14 }} />
            Table {activeTableLabel}
          </Typography>
          {assignedWaiterDisplayName ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Serveur : {assignedWaiterDisplayName}
            </Typography>
          ) : null}
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Mode comptoir
        </Typography>
      )}
    </Box>
    <IconButton
      onClick={onClearOrder}
      color="error"
      size="small"
      disabled={clearActionDisabled}
      title={clearActionTitle}
      aria-label={clearActionTitle}
    >
      <ClearIcon />
    </IconButton>
  </Box>
);

export default OrderSummaryHeader;
