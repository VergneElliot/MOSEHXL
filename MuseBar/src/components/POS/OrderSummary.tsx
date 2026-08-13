/**
 * POS cart: selectable lines + totals (left) | action column (right).
 * Empty selection → actions apply to all eligible (non-tip) lines.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  IconButton,
  Divider,
  Button,
  Box,
  useTheme,
  useMediaQuery,
  Checkbox,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import {
  Clear as ClearIcon,
  CreditCard as CreditCardIcon,
  LocalAtm as CashIcon,
  Settings as OptionsIcon,
  LocalOffer as OffertIcon,
  Person as PersoIcon,
  StickyNote2 as NoteIcon,
  TableRestaurant as TableIcon,
  Schedule as SuivreIcon,
} from '@mui/icons-material';
import { OrderItem } from '../../types';
import { Virtuoso } from 'react-virtuoso';
import OrderSummaryItem from './OrderSummaryItem';
import LineNoteDialog from './LineNoteDialog';
import { getLineNoteFromOptions } from '../../utils/lineItemNote';
import { canUseVirtualization } from '../../utils/canUseVirtualization';
import { POS_PRODUCT_DND_MIME, type PosProductDragPayload } from './posProductDnD';

export type { PosProductDragPayload } from './posProductDnD';
export { POS_PRODUCT_DND_MIME } from './posProductDnD';

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
  /** Drop a product card onto the cart */
  onDropProduct?: (payload: PosProductDragPayload) => void;
  formatCurrency: (amount: number) => string;
}

function resolveTargetIds(order: OrderItem[], selected: Set<string>): string[] {
  const eligible = order.filter(i => !i.isTip);
  if (selected.size === 0) return eligible.map(i => i.id);
  return eligible.filter(i => selected.has(i.id)).map(i => i.id);
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
  onUpdateLineNote,
  onDropProduct,
  formatCurrency,
}: OrderSummaryProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const useVirtualization = canUseVirtualization();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dropActive, setDropActive] = useState(false);
  const [lineNoteDialog, setLineNoteDialog] = useState<{
    targetIds: string[];
    productName: string;
    initialNote: string;
  } | null>(null);

  // Prune selection when lines disappear
  useEffect(() => {
    const alive = new Set(currentOrder.map(i => i.id));
    setSelectedIds(prev => {
      const next = new Set([...prev].filter(id => alive.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [currentOrder]);

  const eligibleIds = useMemo(
    () => currentOrder.filter(i => !i.isTip).map(i => i.id),
    [currentOrder]
  );

  const allEligibleSelected =
    eligibleIds.length > 0 && eligibleIds.every(id => selectedIds.has(id));

  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    currentOrder.forEach((item, index) => map.set(item.id, index));
    return map;
  }, [currentOrder]);

  const targetIds = useMemo(
    () => resolveTargetIds(currentOrder, selectedIds),
    [currentOrder, selectedIds]
  );

  const totalLabelSx = {
    fontWeight: 800,
    fontSize: { xs: '1rem', sm: '1.1rem', md: '1.15rem' },
    lineHeight: 1.1,
  } as const;

  const totalValueSx = {
    fontWeight: 900,
    fontSize: { xs: '1.45rem', sm: '1.7rem', md: '1.9rem' },
    lineHeight: 1.1,
  } as const;

  const actionBtnSx = {
    py: isMobile ? 0.9 : 1.05,
    minHeight: isMobile ? 40 : 44,
    fontSize: { xs: '0.75rem', sm: '0.82rem', md: '0.88rem' },
    fontWeight: 800,
    whiteSpace: 'nowrap',
    lineHeight: 1.1,
    justifyContent: 'flex-start',
    '& .MuiButton-startIcon': { mr: 0.75 },
  } as const;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allEligibleSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(eligibleIds));
  }, [allEligibleSelected, eligibleIds]);

  const applyToTargets = useCallback(
    (fn?: (index: number) => void) => {
      if (!fn) return;
      for (const id of targetIds) {
        const index = indexById.get(id);
        if (index != null) fn(index);
      }
    },
    [targetIds, indexById]
  );

  const handleOpenNotes = useCallback(() => {
    if (!onUpdateLineNote || targetIds.length === 0) return;
    const noteable = targetIds.filter(id => {
      const item = currentOrder[indexById.get(id) ?? -1];
      return item && item.productId;
    });
    if (noteable.length === 0) return;
    const first = currentOrder[indexById.get(noteable[0]!)!]!;
    setLineNoteDialog({
      targetIds: noteable,
      productName:
        noteable.length === 1
          ? first.productName
          : `${noteable.length} articles`,
      initialNote:
        noteable.length === 1 ? getLineNoteFromOptions(first.options) : '',
    });
  }, [onUpdateLineNote, targetIds, currentOrder, indexById]);

  const handleClearOrder = useCallback(() => {
    setSelectedIds(new Set());
    onClearOrder();
  }, [onClearOrder]);

  const handleDragOver = (e: React.DragEvent) => {
    const types = [...e.dataTransfer.types];
    if (!types.includes(POS_PRODUCT_DND_MIME) && !types.includes('text/plain')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDropActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    if (!onDropProduct) return;
    const raw =
      e.dataTransfer.getData(POS_PRODUCT_DND_MIME) || e.dataTransfer.getData('text/plain');
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as PosProductDragPayload;
      if (!payload || typeof payload !== 'object') return;
      if (payload.kind === 'divers' || payload.kind === 'pourboire') {
        onDropProduct(payload);
        return;
      }
      if (payload.kind === 'product' && payload.productId) {
        onDropProduct({
          kind: 'product',
          productId: String(payload.productId),
          quantity: Math.max(1, Math.min(999, Number(payload.quantity) || 1)),
        });
        return;
      }
      // Legacy payloads without kind
      const legacy = payload as unknown as { productId?: string; quantity?: number };
      if (legacy.productId) {
        onDropProduct({
          kind: 'product',
          productId: String(legacy.productId),
          quantity: Math.max(1, Math.min(999, Number(legacy.quantity) || 1)),
        });
      }
    } catch {
      // ignore bad payload
    }
  };

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
          formatCurrency={formatCurrency}
          onToggleSelect={toggleSelect}
          onRemoveItem={onRemoveItem}
        />
      );
    },
    [currentOrder, selectedIds, formatCurrency, toggleSelect, onRemoveItem]
  );

  const hasTargets = targetIds.length > 0;
  const canNote = Boolean(onUpdateLineNote) && targetIds.some(id => {
    const item = currentOrder[indexById.get(id) ?? -1];
    return item && item.productId;
  });

  const actionsColumn = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        flexShrink: 0,
        width: isMobile ? '100%' : 200,
        minWidth: isMobile ? 0 : 180,
        overflow: 'auto',
      }}
    >
      <Typography variant="subtitle2" fontWeight={800}>
        Actions
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, lineHeight: 1.3 }}>
        {selectedIds.size === 0
          ? 'Aucune sélection → toute la commande'
          : `${selectedIds.size} ligne(s) sélectionnée(s)`}
      </Typography>

      {onApplyHappyHour && (
        <Button
          variant="outlined"
          color="secondary"
          fullWidth
          disabled={!hasTargets}
          onClick={() => applyToTargets(onApplyHappyHour)}
          sx={actionBtnSx}
        >
          Happy Hour
        </Button>
      )}
      {onApplyOffert && (
        <Button
          variant="outlined"
          color="success"
          fullWidth
          disabled={!hasTargets}
          startIcon={<OffertIcon />}
          onClick={() => applyToTargets(onApplyOffert)}
          sx={actionBtnSx}
        >
          Offert
        </Button>
      )}
      {onApplyPerso && (
        <Button
          variant="outlined"
          color="info"
          fullWidth
          disabled={!hasTargets}
          startIcon={<PersoIcon />}
          onClick={() => applyToTargets(onApplyPerso)}
          sx={actionBtnSx}
        >
          Perso
        </Button>
      )}
      {onUpdateLineNote && (
        <Button
          variant="outlined"
          color="warning"
          fullWidth
          disabled={!canNote}
          startIcon={<NoteIcon />}
          onClick={handleOpenNotes}
          sx={actionBtnSx}
        >
          Notes
        </Button>
      )}

      <Divider sx={{ my: 0.5 }} />

      <Button
        variant="contained"
        fullWidth
        disabled={!canProcessPayment}
        startIcon={<CreditCardIcon />}
        onClick={onQuickCard}
        sx={{
          ...actionBtnSx,
          bgcolor: 'primary.main',
          justifyContent: 'center',
        }}
      >
        Paiement CB
      </Button>
      <Button
        variant="contained"
        fullWidth
        disabled={!canProcessPayment}
        startIcon={<CashIcon />}
        onClick={onQuickCash}
        sx={{
          ...actionBtnSx,
          bgcolor: 'success.main',
          color: 'success.contrastText',
          justifyContent: 'center',
          '&:hover': { bgcolor: 'success.dark' },
        }}
      >
        Paiement espèces
      </Button>
      <Button
        variant="outlined"
        fullWidth
        disabled={!canProcessPayment}
        startIcon={<OptionsIcon />}
        onClick={onCheckout}
        sx={{ ...actionBtnSx, justifyContent: 'center' }}
      >
        Options de paiement
      </Button>

      <Divider sx={{ my: 0.5 }} />

      <Tooltip title="Bientôt — plan de salle">
        <span>
          <Button
            variant="outlined"
            fullWidth
            disabled
            startIcon={<TableIcon />}
            sx={actionBtnSx}
          >
            Sélectionner une table
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Bientôt — mention cuisine">
        <span>
          <Button
            variant="outlined"
            fullWidth
            disabled
            startIcon={<SuivreIcon />}
            sx={actionBtnSx}
          >
            À suivre
          </Button>
        </span>
      </Tooltip>
    </Box>
  );

  return (
    <Card
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        outline: dropActive ? '2px solid' : 'none',
        outlineColor: 'primary.main',
        bgcolor: dropActive ? 'action.hover' : undefined,
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
            <Box
              sx={{ flexShrink: 0 }}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={0.25}
            >
              <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
                Commande
              </Typography>
              {currentOrder.length > 0 && (
                <IconButton
                  onClick={handleClearOrder}
                  color="error"
                  size="small"
                  title="Vider la commande"
                  aria-label="Vider la commande"
                >
                  <ClearIcon />
                </IconButton>
              )}
            </Box>

            {currentOrder.length > 0 && (
              <FormControlLabel
                sx={{ ml: 0, mb: 0.25, flexShrink: 0 }}
                control={
                  <Checkbox
                    size="small"
                    checked={allEligibleSelected}
                    indeterminate={selectedIds.size > 0 && !allEligibleSelected}
                    onChange={toggleSelectAll}
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
                    {dropActive
                      ? 'Déposez le produit ici'
                      : 'Aucun article — cliquez ou glissez un produit'}
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
                      formatCurrency={formatCurrency}
                      onToggleSelect={toggleSelect}
                      onRemoveItem={onRemoveItem}
                    />
                  ))}
                </List>
              )}
            </Box>

            <Box sx={{ flexShrink: 0, pt: 1 }}>
              <Divider sx={{ mb: 1 }} />
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75} flexWrap="wrap" gap={0.5}>
                <Typography variant="body2">
                  Sous-total HT:{' '}
                  <Box component="span" sx={{ fontWeight: 600 }}>
                    {formatCurrency(orderSubtotal - orderTax)}
                  </Box>
                </Typography>
                <Typography variant="body2">
                  TVA:{' '}
                  <Box component="span" sx={{ fontWeight: 600 }}>
                    {formatCurrency(orderTax)}
                  </Box>
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6" sx={totalLabelSx}>
                  Total TTC:
                </Typography>
                <Typography variant="h6" color="primary" sx={totalValueSx}>
                  {formatCurrency(orderTotal)}
                </Typography>
              </Box>
              {tipsTotal > 0 && (
                <Box display="flex" justifyContent="space-between" mt={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    Pourboire carte (hors CA):
                  </Typography>
                  <Typography variant="body2" color="secondary" fontWeight={700}>
                    {formatCurrency(tipsTotal)}
                  </Typography>
                </Box>
              )}
            </Box>
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
        open={lineNoteDialog != null}
        productName={lineNoteDialog?.productName ?? ''}
        initialNote={lineNoteDialog?.initialNote ?? ''}
        onClose={() => setLineNoteDialog(null)}
        onSave={note => {
          if (lineNoteDialog == null || !onUpdateLineNote) return;
          for (const id of lineNoteDialog.targetIds) {
            const index = indexById.get(id);
            if (index != null) onUpdateLineNote(index, note);
          }
        }}
      />
    </Card>
  );
});

export default OrderSummary;
