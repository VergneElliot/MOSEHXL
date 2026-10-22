/**
 * Three-column custom split board:
 * left = unassigned pool, middle = actions, right = payment carts.
 * Assign via drag-and-drop (pool↔bill and bill↔bill), context menu, or actions.
 * Part total = items + manual top-up; last unlocked part gets the residual.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { Box, Button, TextField, useMediaQuery, useTheme } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import type { LocalSubBill, OrderItem } from '../../../types';
import { saleLines } from '../../../hooks/usePOSOrderTotals';
import { sourceItemId, unassignedItems } from './splitBillCore';
import { clearItemsFromBills, moveItemsToBill } from './splitBillItems';
import {
  createEmptyBills,
  equalAmountBills,
  recomputeBillTotals,
  setBillManualAmount,
} from './splitBillTotals';
import { selectOnFocus } from './selectOnFocus';
import { SplitActionPanel } from './SplitActionPanel';
import SplitPoolColumn from './SplitPoolColumn';
import SplitBillsColumn from './SplitBillsColumn';
import SplitAssignMenu from './SplitAssignMenu';
import SplitRepartirDialog from './SplitRepartirDialog';
import SplitBoardStatus from './SplitBoardStatus';
import { useSplitRepartir } from './useSplitRepartir';
import { useSplitBoardSelection } from './useSplitBoardSelection';
import { useSplitBoardDnD } from './useSplitBoardDnD';

export interface SplitBoardProps {
  orderTotal: number;
  currentOrder: OrderItem[];
  splitCount: number;
  subBills: LocalSubBill[];
  onSplitCountChange: (count: number) => void;
  onSubBillsChange: (bills: LocalSubBill[]) => void;
  onSubBillPaymentMethodChange: (billId: string, method: 'cash' | 'card') => void;
  loading: boolean;
  onConfirm: () => void;
}

export const SplitBoard: React.FC<SplitBoardProps> = ({
  orderTotal,
  currentOrder,
  splitCount,
  subBills,
  onSplitCountChange,
  onSubBillsChange,
  onSubBillPaymentMethodChange,
  loading,
  onConfirm,
}) => {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const saleOrder = useMemo(() => saleLines(currentOrder), [currentOrder]);
  const pool = useMemo(() => unassignedItems(saleOrder, subBills), [saleOrder, subBills]);
  const {
    selectedIds,
    allPoolSelected,
    toggleAll,
    toggleOne,
    removeIds,
    clearSelection,
  } = useSplitBoardSelection(pool);

  useEffect(() => {
    if (subBills.length !== splitCount) {
      onSubBillsChange(
        recomputeBillTotals(createEmptyBills(splitCount, subBills), orderTotal)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitCount]);

  useEffect(() => {
    const next = recomputeBillTotals(subBills, orderTotal);
    const changed = next.some((b, i) => b.total !== subBills[i]?.total);
    if (changed) onSubBillsChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderTotal]);

  const totalSplit = subBills.reduce((sum, b) => sum + b.total, 0);
  const isValid =
    subBills.length > 0 && Math.round(totalSplit * 100) === Math.round(orderTotal * 100);

  const resolveItems = useCallback(
    (ids: string[]) => saleOrder.filter(i => ids.includes(i.id)),
    [saleOrder]
  );

  const repartir = useSplitRepartir({
    subBills,
    orderTotal,
    resolveItems,
    onSubBillsChange,
    onItemsAssigned: removeIds,
  });
  const { closeMenu, openContextMenu, openRepartirDialog } = repartir;

  const assignToBill = useCallback(
    (ids: string[], billIndex: number) => {
      const items = resolveItems(ids);
      if (items.length === 0) return;
      onSubBillsChange(moveItemsToBill(subBills, items, billIndex, orderTotal));
      removeIds(ids);
      closeMenu();
    },
    [resolveItems, subBills, onSubBillsChange, orderTotal, removeIds, closeMenu]
  );

  const dnd = useSplitBoardDnD({
    selectedIds,
    saleOrder,
    assignToBill,
  });

  const returnItemToPool = (sourceId: string) => {
    onSubBillsChange(clearItemsFromBills(subBills, [sourceId], orderTotal));
  };

  const returnIdsToPool = (ids: string[]) => {
    const sourceIds = [...new Set(ids.map(id => sourceItemId(id)))];
    if (sourceIds.length === 0) return;
    onSubBillsChange(clearItemsFromBills(subBills, sourceIds, orderTotal));
  };

  const resetBills = () => {
    onSubBillsChange(recomputeBillTotals(createEmptyBills(splitCount), orderTotal));
    clearSelection();
  };

  const applyEqualAmounts = () => {
    onSubBillsChange(equalAmountBills(splitCount, orderTotal, subBills));
    clearSelection();
  };

  const handleAmountChange = (billIndex: number, raw: string) => {
    onSubBillsChange(setBillManualAmount(subBills, billIndex, raw, orderTotal));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
        <TextField
          label="Nombre de paiements"
          type="number"
          size="small"
          value={splitCount}
          onChange={e => {
            const n = parseInt(e.target.value, 10);
            onSplitCountChange(Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 1);
          }}
          onFocus={selectOnFocus}
          inputProps={{ min: 1, max: 10 }}
          helperText="1–10 parts"
          sx={{ maxWidth: 180 }}
        />
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={resetBills}>
          Réinitialiser
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: isNarrow
            ? '1fr'
            : 'minmax(0, 1.15fr) minmax(148px, 0.42fr) minmax(0, 1.15fr)',
          gap: 2,
          minHeight: 320,
          alignItems: 'stretch',
        }}
      >
        <SplitPoolColumn
          pool={pool}
          selectedIds={selectedIds}
          allPoolSelected={allPoolSelected}
          onToggleAll={toggleAll}
          onToggleOne={toggleOne}
          onDragStart={dnd.handleDragStart}
          onContextMenu={openContextMenu}
          onReturnIds={returnIdsToPool}
        />
        <SplitActionPanel
          billCount={subBills.length}
          hasSelection={selectedIds.size > 0}
          onEqualAmounts={applyEqualAmounts}
          onAssignToBill={index => assignToBill([...selectedIds], index)}
          onRepartir={() => openRepartirDialog([...selectedIds])}
        />
        <SplitBillsColumn
          subBills={subBills}
          dropTarget={dnd.dropTarget}
          onAssignIds={assignToBill}
          onDragOver={dnd.handleDragOverBill}
          onDragLeave={dnd.handleDragLeaveBill}
          onDrop={dnd.handleDropOnBill}
          onAmountChange={handleAmountChange}
          onPaymentMethodChange={onSubBillPaymentMethodChange}
          onReturnItemToPool={returnItemToPool}
        />
      </Box>

      <SplitBoardStatus
        orderTotal={orderTotal}
        totalSplit={totalSplit}
        isValid={isValid}
        loading={loading}
        billCount={subBills.length}
        poolLength={pool.length}
        onConfirm={onConfirm}
      />

      <SplitAssignMenu
        menuAnchor={repartir.menuAnchor}
        pickBillsOpen={repartir.pickBillsOpen}
        subBills={subBills}
        onClose={closeMenu}
        onAssignToBill={assignToBill}
        onRepartir={openRepartirDialog}
      />
      <SplitRepartirDialog subBills={subBills} repartir={repartir} />
    </Box>
  );
};

export default SplitBoard;
