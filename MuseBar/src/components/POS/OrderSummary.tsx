/**
 * POS cart: selectable lines + totals (left) | action column (right).
 * Empty selection → actions apply to all eligible (non-tip) lines.
 */

import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { OrderItem } from '../../types';
import LineNoteDialog from './LineNoteDialog';
import OrderSummaryActions from './OrderSummaryActions';
import OrderSummaryHeader from './OrderSummaryHeader';
import OrderSummaryLines from './OrderSummaryLines';
import OrderSummaryTotals from './OrderSummaryTotals';
import { useOrderSummaryLogic } from './useOrderSummaryLogic';

interface OrderSummaryProps {
  currentOrder: OrderItem[];
  orderTotal: number;
  orderTax: number;
  orderSubtotal: number;
  /** Card tips from Pourboire lines — shown separately, not in Total TTC. */
  tipsTotal?: number;
  canProcessPayment: boolean;
  onRemoveItem: (index: number) => void;
  onClearOrder: () => void;
  /** Open payment options dialog (split + faire de la monnaie) */
  onCheckout: () => void;
  /** Quick payment: full order by card */
  onQuickCard?: () => void;
  /** Quick payment: full order by cash */
  onQuickCash?: () => void;
  /** Apply default Happy Hour discount to this line (manual) */
  onApplyHappyHour?: (index: number) => void;
  /** Set line to 0€ — offered to customer (traceability: [Offert]) */
  onApplyOffert?: (index: number) => void;
  /** Set line to 0€ — consumed by staff (traceability: [Perso]) */
  onApplyPerso?: (index: number) => void;
  /** Add or edit an ad-hoc kitchen note on a line */
  onUpdateLineNote?: (index: number, note: string) => void;
  /** Open remise dialog for selected line indices (empty = all eligible). */
  onApplyRemise?: (indices: number[]) => void;
  /** Open floor map / select table */
  onSelectTable?: () => void;
  /** Label of bound table, if any */
  activeTableLabel?: string | null;
  /** Send kitchen follow-up (À suivre) */
  onSuivre?: () => void;
  /** Validate table order without checkout (sync + kitchen tickets) */
  onValidateTableOrder?: () => void;
  /** Open assign-to table/waiter dialog */
  onAssignOrder?: () => void;
  /** Waiter assigned to the active table ticket (accounting) */
  assignedWaiterDisplayName?: string | null;
  /** Controlled cart line selection (empty = all lines for actions). */
  cartSelectedIds: Set<string>;
  onCartSelectedIdsChange: (ids: Set<string>) => void;
  formatCurrency: (amount: number) => string;
}

const OrderSummary = React.memo(function OrderSummary({
  currentOrder,
  orderTotal,
  orderTax,
  orderSubtotal,
  tipsTotal = 0,
  canProcessPayment,
  onRemoveItem,
  onClearOrder,
  onCheckout,
  onQuickCard,
  onQuickCash,
  onApplyHappyHour,
  onApplyOffert,
  onApplyPerso,
  onApplyRemise,
  onUpdateLineNote,
  onSelectTable,
  activeTableLabel = null,
  onSuivre,
  onValidateTableOrder,
  onAssignOrder,
  assignedWaiterDisplayName = null,
  cartSelectedIds,
  onCartSelectedIdsChange,
  formatCurrency,
}: OrderSummaryProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const logic = useOrderSummaryLogic({
    currentOrder,
    cartSelectedIds,
    onCartSelectedIdsChange,
    activeTableLabel,
    onUpdateLineNote,
    onClearOrder,
  });

  const remiseIndices = logic.targetIds
    .map((id) => logic.indexById.get(id))
    .filter((i): i is number => i != null);

  const actionsColumn = (
    <OrderSummaryActions
      isMobile={isMobile}
      selectedCount={logic.selectedIds.size}
      hasTargets={logic.hasTargets}
      hasTargetItems={logic.hasTargetItems}
      hasPendingTableValidation={logic.hasPendingTableValidation}
      canNote={logic.canNote}
      canProcessPayment={canProcessPayment}
      activeTableLabel={activeTableLabel}
      onApplyHappyHour={onApplyHappyHour}
      onApplyOffert={onApplyOffert}
      onApplyPerso={onApplyPerso}
      onApplyRemise={onApplyRemise}
      onUpdateLineNote={onUpdateLineNote}
      onCheckout={onCheckout}
      onQuickCard={onQuickCard}
      onQuickCash={onQuickCash}
      onValidateTableOrder={onValidateTableOrder}
      onAssignOrder={onAssignOrder}
      onSelectTable={onSelectTable}
      onSuivre={onSuivre}
      applyToTargets={logic.applyToTargets}
      remiseIndices={remiseIndices}
      onOpenNotes={logic.handleOpenNotes}
    />
  );

  return (
    <Card
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <CardContent
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pt: 0.4,
          px: 1.25,
          pb: 0.75,
          '&:last-child': { pb: 0.75 },
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 1.5,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <OrderSummaryHeader
              activeTableLabel={activeTableLabel}
              assignedWaiterDisplayName={assignedWaiterDisplayName}
              clearActionTitle={logic.clearActionTitle}
              clearActionDisabled={logic.clearActionDisabled}
              onClearOrder={logic.handleClearOrder}
            />
            <OrderSummaryLines
              currentOrder={currentOrder}
              selectedIds={logic.selectedIds}
              eligibleIds={logic.eligibleIds}
              allEligibleSelected={logic.allEligibleSelected}
              activeTableLabel={activeTableLabel}
              formatCurrency={formatCurrency}
              onToggleSelect={logic.toggleSelect}
              onToggleSelectAll={logic.toggleSelectAll}
              onRemoveItem={onRemoveItem}
            />
            <OrderSummaryTotals
              orderTotal={orderTotal}
              orderTax={orderTax}
              orderSubtotal={orderSubtotal}
              tipsTotal={tipsTotal}
              formatCurrency={formatCurrency}
            />
          </Box>

          {!isMobile && (
            <>
              <Divider orientation="vertical" flexItem />
              {actionsColumn}
            </>
          )}
        </Box>

        {isMobile && (
          <Box sx={{ flexShrink: 0, mt: 1.5, pt: 1, borderTop: 1, borderColor: 'divider' }}>
            {actionsColumn}
          </Box>
        )}
      </CardContent>

      <LineNoteDialog
        open={logic.lineNoteDialog != null}
        productName={logic.lineNoteDialog?.productName ?? ''}
        initialNote={logic.lineNoteDialog?.initialNote ?? ''}
        onClose={logic.closeLineNoteDialog}
        onSave={logic.handleSaveLineNotes}
      />
    </Card>
  );
});

export default OrderSummary;
