import React, { useCallback } from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  List,
  Typography,
} from '@mui/material';
import { Virtuoso } from 'react-virtuoso';
import type { OrderItem } from '../../types';
import { canUseVirtualization } from '../../utils/canUseVirtualization';
import OrderSummaryItem from './OrderSummaryItem';

interface OrderSummaryLinesProps {
  currentOrder: OrderItem[];
  selectedIds: Set<string>;
  eligibleIds: string[];
  allEligibleSelected: boolean;
  activeTableLabel?: string | null;
  formatCurrency: (amount: number) => string;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onRemoveItem: (index: number) => void;
}

const OrderSummaryLines: React.FC<OrderSummaryLinesProps> = ({
  currentOrder,
  selectedIds,
  eligibleIds,
  allEligibleSelected,
  activeTableLabel = null,
  formatCurrency,
  onToggleSelect,
  onToggleSelectAll,
  onRemoveItem,
}) => {
  const useVirtualization = canUseVirtualization();

  const renderOrderLine = useCallback(
    (index: number) => {
      const item = currentOrder[index];
      if (!item) return null;
      return (
        <OrderSummaryItem
          item={item}
          index={index}
          isLast={index === currentOrder.length - 1}
          selected={selectedIds.has(item.id)}
          showTableLineStatus={Boolean(activeTableLabel)}
          formatCurrency={formatCurrency}
          onToggleSelect={onToggleSelect}
          onRemoveItem={onRemoveItem}
        />
      );
    },
    [currentOrder, selectedIds, activeTableLabel, formatCurrency, onToggleSelect, onRemoveItem]
  );

  return (
    <>
      {currentOrder.length > 0 && (
        <FormControlLabel
          sx={{ ml: 0, mb: 0.25, flexShrink: 0 }}
          control={
            <Checkbox
              size="small"
              checked={allEligibleSelected}
              indeterminate={selectedIds.size > 0 && !allEligibleSelected}
              onChange={onToggleSelectAll}
              disabled={eligibleIds.length === 0}
            />
          }
          label={
            <Typography variant="body2" fontWeight={600}>
              Tout sélectionner
            </Typography>
          }
        />
      )}

      <Box sx={{ flex: 1, minHeight: 0, overflow: useVirtualization ? 'hidden' : 'auto' }}>
        {currentOrder.length === 0 ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            py={4}
            minHeight="100%"
          >
            <Typography color="textSecondary">
              Aucun article — appuyez sur un produit pour l’ajouter
            </Typography>
          </Box>
        ) : useVirtualization ? (
          <Virtuoso
            style={{ height: '100%' }}
            totalCount={currentOrder.length}
            overscan={200}
            itemContent={renderOrderLine}
          />
        ) : (
          <List sx={{ py: 0 }}>
            {currentOrder.map((item, index) => (
              <OrderSummaryItem
                key={item.id}
                item={item}
                index={index}
                isLast={index === currentOrder.length - 1}
                selected={selectedIds.has(item.id)}
                showTableLineStatus={Boolean(activeTableLabel)}
                formatCurrency={formatCurrency}
                onToggleSelect={onToggleSelect}
                onRemoveItem={onRemoveItem}
              />
            ))}
          </List>
        )}
      </Box>
    </>
  );
};

export default OrderSummaryLines;
