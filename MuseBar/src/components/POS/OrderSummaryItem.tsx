import React from 'react';
import { ListItem, Box, Typography, IconButton, Button, Chip, Divider } from '@mui/material';
import { Delete as DeleteIcon, LocalOffer as OffertIcon, Person as PersoIcon } from '@mui/icons-material';
import type { OrderItem } from '../../types';

interface OrderSummaryItemProps {
  item: OrderItem;
  index: number;
  isLast: boolean;
  formatCurrency: (amount: number) => string;
  onRemoveItem: (index: number) => void;
  onApplyHappyHour?: (index: number) => void;
  onApplyOffert?: (index: number) => void;
  onApplyPerso?: (index: number) => void;
}

const OrderSummaryItem: React.FC<OrderSummaryItemProps> = ({
  item,
  index,
  isLast,
  formatCurrency,
  onRemoveItem,
  onApplyHappyHour,
  onApplyOffert,
  onApplyPerso,
}) => {
  return (
    <>
      <ListItem sx={{ px: 0, py: 1 }}>
        <Box sx={{ width: '100%' }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
            <Typography variant="body2" sx={{ fontWeight: 'medium', flexGrow: 1 }}>
              {item.productName}
            </Typography>
            <IconButton
              onClick={() => onRemoveItem(index)}
              size="small"
              color="error"
              sx={{ ml: 0.5 }}
              aria-label="Supprimer"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Box textAlign="left">
              <Typography variant="body2" color="primary" fontWeight="bold">
                {formatCurrency(item.totalPrice)}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
            {onApplyHappyHour && (
              <Button
                size="small"
                variant={item.isHappyHourApplied ? 'contained' : 'outlined'}
                color="secondary"
                onClick={() => onApplyHappyHour(index)}
                sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: '0.7rem' }}
              >
                Happy Hour
              </Button>
            )}
            {onApplyOffert && (
              <Button
                size="small"
                variant={item.isOffert ? 'contained' : 'outlined'}
                color="success"
                onClick={() => onApplyOffert(index)}
                startIcon={<OffertIcon sx={{ fontSize: 14 }} />}
                sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: '0.7rem' }}
              >
                Offert
              </Button>
            )}
            {onApplyPerso && (
              <Button
                size="small"
                variant={item.isPerso ? 'contained' : 'outlined'}
                color="info"
                onClick={() => onApplyPerso(index)}
                startIcon={<PersoIcon sx={{ fontSize: 14 }} />}
                sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: '0.7rem' }}
              >
                Perso
              </Button>
            )}
          </Box>

          {(item.isHappyHourApplied || item.isOffert || item.isPerso) && (
            <Box sx={{ mt: 0.5 }} display="flex" gap={0.5} flexWrap="wrap">
              {item.isHappyHourApplied && <Chip label="Happy Hour" size="small" color="secondary" />}
              {item.isOffert && <Chip label="Offert" size="small" color="success" />}
              {item.isPerso && <Chip label="Personnel" size="small" color="info" />}
            </Box>
          )}
        </Box>
      </ListItem>
      {!isLast && <Divider />}
    </>
  );
};

export default OrderSummaryItem;

