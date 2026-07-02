import React from 'react';
import { ListItem, Box, Typography, IconButton, Button, Divider } from '@mui/material';
import { Delete as DeleteIcon, LocalOffer as OffertIcon, Person as PersoIcon, StickyNote2 as NoteIcon } from '@mui/icons-material';
import type { OrderItem } from '../../types';
import { formatOrderItemOptionLabel } from '../../utils/orderItemOptions';
import { getLineNoteFromOptions } from '../../utils/lineItemNote';

interface OrderSummaryItemProps {
  item: OrderItem;
  index: number;
  isLast: boolean;
  formatCurrency: (amount: number) => string;
  onRemoveItem: (index: number) => void;
  onApplyHappyHour?: (index: number) => void;
  onApplyOffert?: (index: number) => void;
  onApplyPerso?: (index: number) => void;
  onEditLineNote?: (index: number) => void;
}

const OrderSummaryItem = React.memo(function OrderSummaryItem({
  item,
  index,
  isLast,
  formatCurrency,
  onRemoveItem,
  onApplyHappyHour,
  onApplyOffert,
  onApplyPerso,
  onEditLineNote,
}: OrderSummaryItemProps) {
  const lineNote = getLineNoteFromOptions(item.options);
  const lineActionButtonSx = {
    minWidth: 'auto',
    px: { xs: 1, md: 1.1 },
    py: { xs: 0.35, md: 0.45 },
    fontSize: { xs: '0.72rem', sm: '0.78rem', md: '0.84rem' },
    fontWeight: 700,
    whiteSpace: 'nowrap',
    lineHeight: 1,
  } as const;

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
            {item.options && item.options.length > 0 && (
              <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                {item.options.map((option, optionIndex) => (
                  <Typography
                    key={`${option.groupId ?? 'note'}-${optionIndex}`}
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.9rem', md: '0.98rem' } }}
                  >
                    {formatOrderItemOptionLabel(option)}
                  </Typography>
                ))}
              </Box>
            )}
            <IconButton
              onClick={() => onRemoveItem(index)}
              size="medium"
              color="error"
              sx={{ ml: 0.5, p: 0.75 }}
              aria-label="Supprimer"
            >
              <DeleteIcon fontSize="medium" />
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
                  sx={lineActionButtonSx}
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
                  startIcon={<OffertIcon sx={{ fontSize: { xs: 16, md: 18 } }} />}
                  sx={{ ...lineActionButtonSx, '& .MuiButton-startIcon': { mr: 0.45 } }}
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
                  startIcon={<PersoIcon sx={{ fontSize: { xs: 16, md: 18 } }} />}
                  sx={{ ...lineActionButtonSx, '& .MuiButton-startIcon': { mr: 0.45 } }}
                >
                  Perso
                </Button>
              )}
              {onEditLineNote && item.productId && (
                <Button
                  size="small"
                  variant={lineNote ? 'contained' : 'outlined'}
                  color="warning"
                  onClick={() => onEditLineNote(index)}
                  startIcon={<NoteIcon sx={{ fontSize: { xs: 16, md: 18 } }} />}
                  sx={{ ...lineActionButtonSx, '& .MuiButton-startIcon': { mr: 0.45 } }}
                >
                  Note
                </Button>
              )}
            </Box>
          </Box>

        </Box>
      </ListItem>
      {!isLast && <Divider />}
    </>
  );
});

export default OrderSummaryItem;

