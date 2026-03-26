import React from 'react';
import { ListItem, Box, Typography, IconButton, Button, Divider } from '@mui/material';
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
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.2}>
            <Typography
              variant="body1"
              sx={{ fontWeight: 700, fontSize: { xs: '1.22rem', md: '1.42rem' }, lineHeight: 1.2, flexGrow: 1 }}
            >
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

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            gap={0.75}
            mb={0.25}
            sx={{ flexWrap: 'nowrap' }}
          >
            <Typography variant="body1" color="primary" fontWeight="bold" sx={{ fontSize: { xs: '1rem', md: '1.08rem' }, flexShrink: 0 }}>
              {formatCurrency(item.totalPrice)}
            </Typography>

            <Box display="flex" flexWrap="nowrap" gap={0.4} sx={{ ml: 'auto', overflowX: 'auto', pb: 0.25 }}>
              {onApplyHappyHour && (
                <Button
                  size="small"
                  variant={item.isHappyHourApplied ? 'contained' : 'outlined'}
                  color="secondary"
                  onClick={() => onApplyHappyHour(index)}
                  sx={{ minWidth: 'auto', px: 0.75, py: 0.15, fontSize: '0.62rem', whiteSpace: 'nowrap' }}
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
                  startIcon={<OffertIcon sx={{ fontSize: 12 }} />}
                  sx={{ minWidth: 'auto', px: 0.75, py: 0.15, fontSize: '0.62rem', whiteSpace: 'nowrap', '& .MuiButton-startIcon': { mr: 0.35 } }}
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
                  startIcon={<PersoIcon sx={{ fontSize: 12 }} />}
                  sx={{ minWidth: 'auto', px: 0.75, py: 0.15, fontSize: '0.62rem', whiteSpace: 'nowrap', '& .MuiButton-startIcon': { mr: 0.35 } }}
                >
                  Perso
                </Button>
              )}
            </Box>
          </Box>

        </Box>
      </ListItem>
      {!isLast && <Divider />}
    </>
  );
};

export default OrderSummaryItem;

