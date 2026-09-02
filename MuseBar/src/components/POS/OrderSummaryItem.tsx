import React from 'react';
import { ListItem, Box, Typography, IconButton, Checkbox, Divider, Chip } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import type { OrderItem } from '../../types';
import { formatOrderItemOptionLabel } from '../../utils/orderItemOptions';
import { getLineNoteFromOptions } from '../../utils/lineItemNote';

interface OrderSummaryItemProps {
  item: OrderItem;
  index: number;
  isLast: boolean;
  selected: boolean;
  showTableLineStatus?: boolean;
  formatCurrency: (amount: number) => string;
  onToggleSelect: (id: string) => void;
  onRemoveItem: (index: number) => void;
}

const OrderSummaryItem = React.memo(function OrderSummaryItem({
  item,
  index,
  isLast,
  selected,
  showTableLineStatus = false,
  formatCurrency,
  onToggleSelect,
  onRemoveItem,
}: OrderSummaryItemProps) {
  const lineNote = getLineNoteFromOptions(item.options);
  const isValidatedTableLine = showTableLineStatus && item.tableLineStatus === 'validated';
  const isDraftTableLine =
    showTableLineStatus && item.tableLineStatus !== 'validated' && !item.isTip;

  return (
    <>
      <ListItem
        onClick={() => onToggleSelect(item.id)}
        sx={{
          px: 0.5,
          py: 1,
          bgcolor: selected ? 'action.selected' : isDraftTableLine ? 'action.hover' : 'transparent',
          borderRadius: 1,
          borderLeft: isValidatedTableLine ? 3 : isDraftTableLine ? 3 : 0,
          borderColor: isValidatedTableLine
            ? 'success.main'
            : isDraftTableLine
              ? 'warning.main'
              : 'transparent',
          cursor: 'pointer',
          '&:hover': { bgcolor: selected ? 'action.selected' : 'action.hover' },
        }}
      >
        <Box sx={{ width: '100%', display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
          <Checkbox
            edge="start"
            checked={selected}
            // Toggle handled by row click; keep checkbox visual only (avoid double-toggle).
            tabIndex={-1}
            disableRipple
            size="small"
            sx={{ mt: 0.25, pointerEvents: 'none' }}
            inputProps={{ 'aria-label': `Sélectionner ${item.productName}` }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.2}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1.1rem', md: '1.25rem' },
                    lineHeight: 1.2,
                    pr: 0.5,
                  }}
                >
                  {item.productName}
                </Typography>
                {showTableLineStatus && !item.isTip && (
                  <Chip
                    label={isValidatedTableLine ? 'Validé' : 'En attente'}
                    size="small"
                    color={isValidatedTableLine ? 'success' : 'warning'}
                    variant="outlined"
                    sx={{ mt: 0.35, height: 22, fontSize: '0.68rem', fontWeight: 700 }}
                  />
                )}
              </Box>
              <IconButton
                onClick={e => {
                  e.stopPropagation();
                  onRemoveItem(index);
                }}
                size="small"
                color="error"
                sx={{ ml: 0.25, p: 0.5 }}
                aria-label={isValidatedTableLine ? 'Retour article' : 'Supprimer'}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>

            {item.options && item.options.length > 0 && (
              <Box sx={{ mb: 0.35, display: 'flex', flexDirection: 'column', gap: 0.15 }}>
                {item.options.map((option, optionIndex) => (
                  <Typography
                    key={`${option.groupId ?? 'note'}-${optionIndex}`}
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.85rem', md: '0.9rem' } }}
                  >
                    {formatOrderItemOptionLabel(option)}
                  </Typography>
                ))}
              </Box>
            )}

            <Box display="flex" justifyContent="space-between" alignItems="center" gap={0.75}>
              <Typography
                variant="body1"
                color="primary"
                fontWeight="bold"
                sx={{ fontSize: { xs: '0.95rem', md: '1.05rem' } }}
              >
                {formatCurrency(item.totalPrice)}
              </Typography>
              {item.isTip && (
                <Typography variant="caption" color="secondary" sx={{ fontWeight: 700 }}>
                  Hors CA
                </Typography>
              )}
              {!item.isTip && lineNote && (
                <Typography
                  variant="caption"
                  color="warning.main"
                  sx={{ fontWeight: 600, maxWidth: '50%', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  Note
                </Typography>
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
