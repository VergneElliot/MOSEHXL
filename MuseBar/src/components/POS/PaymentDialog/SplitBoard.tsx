/**
 * Two-column custom split board:
 * left = unassigned order lines (checkboxes), right = payment carts.
 * Assign via drag-and-drop, context menu, or action buttons.
 * Part total = items + manual top-up; last unlocked part gets the residual.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  CallSplit as SplitIcon,
  CreditCard as CardIcon,
  Delete as DeleteIcon,
  LocalAtm as CashIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import type { LocalSubBill, OrderItem } from '../../../types';
import { formatCurrency } from '../../../utils/formatCurrency';
import { saleLines } from '../../../hooks/usePOSOrderTotals';
import {
  billManualDisplay,
  billTotalFromItems,
  cents,
  clearItemsFromBills,
  createEmptyBills,
  dialogResidualIndex,
  equalAmountBills,
  fromCents,
  moveItemsToBill,
  recomputeBillTotals,
  residualBillIndex,
  resolveSplitShareCents,
  setBillManualAmount,
  sourceItemId,
  splitItemsByShareCents,
  unassignedItems,
} from './splitAssignment';

const DND_MIME = 'application/x-mosehxl-split-items';

function selectOnFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.select();
}

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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [menuAnchor, setMenuAnchor] = useState<{
    mouseX: number;
    mouseY: number;
    itemIds: string[];
  } | null>(null);
  const [pickBillsOpen, setPickBillsOpen] = useState(false);
  const [pickBillIds, setPickBillIds] = useState<Set<number>>(new Set());
  /** Raw typed amounts in the Répartir dialog (empty string = auto / residual). */
  const [pickAmounts, setPickAmounts] = useState<Record<number, string>>({});
  const [dropTarget, setDropTarget] = useState<number | null>(null);

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

  const residualIndex = residualBillIndex(subBills);

  useEffect(() => {
    setSelectedIds(prev => {
      const next = new Set([...prev].filter(id => pool.some(i => i.id === id)));
      return next.size === prev.size ? prev : next;
    });
  }, [pool]);

  const totalSplit = subBills.reduce((sum, b) => sum + b.total, 0);
  const isValid =
    subBills.length > 0 && Math.round(totalSplit * 100) === Math.round(orderTotal * 100);

  const allPoolSelected = pool.length > 0 && selectedIds.size === pool.length;

  const toggleAll = () => {
    if (allPoolSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(pool.map(i => i.id)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resolveItems = useCallback(
    (ids: string[]) => saleOrder.filter(i => ids.includes(i.id)),
    [saleOrder]
  );

  const assignToBill = useCallback(
    (ids: string[], billIndex: number) => {
      const items = resolveItems(ids);
      if (items.length === 0) return;
      onSubBillsChange(moveItemsToBill(subBills, items, billIndex, orderTotal));
      setSelectedIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
      setMenuAnchor(null);
    },
    [resolveItems, subBills, onSubBillsChange, orderTotal]
  );

  const openRepartirDialog = (itemIds: string[]) => {
    if (itemIds.length === 0) return;
    setMenuAnchor({ mouseX: 0, mouseY: 0, itemIds });
    setPickBillIds(new Set(subBills.map((_, i) => i)));
    setPickAmounts({});
    setPickBillsOpen(true);
  };

  const pickItemsTotal = useMemo(() => {
    if (!menuAnchor) return 0;
    return billTotalFromItems(resolveItems(menuAnchor.itemIds));
  }, [menuAnchor, resolveItems]);

  const pickParsedAmounts = useMemo(() => {
    const out: Record<number, number | null> = {};
    for (const index of pickBillIds) {
      const raw = (pickAmounts[index] ?? '').trim().replace(',', '.');
      if (raw === '') out[index] = null;
      else {
        const v = parseFloat(raw);
        out[index] = Number.isFinite(v) && v >= 0 ? v : null;
      }
    }
    return out;
  }, [pickBillIds, pickAmounts]);

  const pickShares = useMemo(() => {
    const indices = [...pickBillIds];
    return resolveSplitShareCents(cents(pickItemsTotal), indices, pickParsedAmounts);
  }, [pickBillIds, pickItemsTotal, pickParsedAmounts]);

  const pickResidual = dialogResidualIndex([...pickBillIds], pickParsedAmounts);

  const pickSharesValid = useMemo(() => {
    if (pickBillIds.size === 0 || pickItemsTotal <= 0) return false;
    const sum = Object.values(pickShares).reduce((a, b) => a + b, 0);
    return sum === cents(pickItemsTotal);
  }, [pickBillIds.size, pickItemsTotal, pickShares]);

  const applyRepartir = () => {
    if (!menuAnchor || !pickSharesValid) return;
    const items = resolveItems(menuAnchor.itemIds);
    onSubBillsChange(splitItemsByShareCents(subBills, items, pickShares, orderTotal));
    setSelectedIds(prev => {
      const next = new Set(prev);
      menuAnchor.itemIds.forEach(id => next.delete(id));
      return next;
    });
    setMenuAnchor(null);
    setPickBillsOpen(false);
    setPickAmounts({});
  };

  const openContextMenu = (event: React.MouseEvent, itemIds: string[]) => {
    event.preventDefault();
    if (itemIds.length === 0) return;
    setMenuAnchor({ mouseX: event.clientX + 2, mouseY: event.clientY - 6, itemIds });
  };

  const handleDragStart = (event: React.DragEvent, itemId: string) => {
    // Multi-drag only when this item is already checked; otherwise drag just this one.
    const ids =
      selectedIds.has(itemId) && selectedIds.size > 1 ? [...selectedIds] : [itemId];
    event.dataTransfer.setData(DND_MIME, JSON.stringify(ids));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnBill = (event: React.DragEvent, billIndex: number) => {
    event.preventDefault();
    setDropTarget(null);
    const raw = event.dataTransfer.getData(DND_MIME);
    if (!raw) return;
    try {
      const ids = JSON.parse(raw) as string[];
      if (Array.isArray(ids) && ids.length > 0) assignToBill(ids, billIndex);
    } catch {
      // ignore bad payload
    }
  };

  const returnItemToPool = (sourceId: string) => {
    onSubBillsChange(clearItemsFromBills(subBills, [sourceId], orderTotal));
  };

  const resetBills = () => {
    onSubBillsChange(recomputeBillTotals(createEmptyBills(splitCount), orderTotal));
    setSelectedIds(new Set());
  };

  const applyEqualAmounts = () => {
    onSubBillsChange(equalAmountBills(splitCount, orderTotal, subBills));
    setSelectedIds(new Set());
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
        <Button variant="outlined" startIcon={<SplitIcon />} onClick={applyEqualAmounts}>
          Parts égales (montants)
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr',
          gap: 2,
          minHeight: 320,
        }}
      >
        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', minHeight: 280 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Articles de la commande
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={allPoolSelected}
                indeterminate={selectedIds.size > 0 && !allPoolSelected}
                onChange={toggleAll}
                disabled={pool.length === 0}
              />
            }
            label="Tout sélectionner"
          />
          {pool.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 1 }}>
              Tous les articles sont assignés.
            </Typography>
          ) : (
            <List dense sx={{ overflow: 'auto', flex: 1 }}>
              {pool.map(item => (
                <PoolItemRow
                  key={item.id}
                  item={item}
                  selected={selectedIds.has(item.id)}
                  onToggle={() => toggleOne(item.id)}
                  onDragStart={e => handleDragStart(e, item.id)}
                  onContextMenu={e => {
                    const ids = selectedIds.has(item.id) ? [...selectedIds] : [item.id];
                    openContextMenu(e, ids);
                  }}
                  formatCurrency={formatCurrency}
                />
              ))}
            </List>
          )}
          {selectedIds.size > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {subBills.map((_, index) => (
                <Button
                  key={index}
                  size="small"
                  variant="contained"
                  onClick={() => assignToBill([...selectedIds], index)}
                >
                  → Paiement {index + 1}
                </Button>
              ))}
              <Button size="small" variant="outlined" onClick={() => openRepartirDialog([...selectedIds])}>
                Répartir…
              </Button>
            </Box>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Astuce : glisser un article sans le cocher ; cochez pour en déplacer plusieurs. Clic
            droit / appui long pour le menu.
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, overflow: 'auto' }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Paiements
          </Typography>
          {subBills.map((bill, index) => {
            const method = bill.payments[0]?.method === 'cash' ? 'cash' : 'card';
            const isDrop = dropTarget === index;
            const isResidual = residualIndex === index;
            const itemSum = billTotalFromItems(bill.items);
            const manualValue = billManualDisplay(bill, isResidual);
            const amountDisplay =
              isResidual || bill.manualAmount != null
                ? String(Number.isInteger(manualValue) ? manualValue : manualValue.toFixed(2))
                : '';

            return (
              <Paper
                key={bill.id}
                variant="outlined"
                onDragOver={e => {
                  e.preventDefault();
                  setDropTarget(index);
                }}
                onDragLeave={() => setDropTarget(prev => (prev === index ? null : prev))}
                onDrop={e => handleDropOnBill(e, index)}
                sx={{
                  p: 1.25,
                  borderColor: isDrop ? 'primary.main' : isResidual ? 'info.light' : 'divider',
                  borderWidth: isDrop ? 2 : 1,
                  bgcolor: isDrop ? 'action.hover' : 'grey.50',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1,
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography fontWeight={700} sx={{ mr: 0.5 }}>
                    Paiement {index + 1}
                  </Typography>
                  {isResidual && (
                    <Chip size="small" color="info" label="Solde auto" variant="outlined" />
                  )}
                  <TextField
                    size="small"
                    label="Montant"
                    type="number"
                    value={amountDisplay}
                    onChange={e => handleAmountChange(index, e.target.value)}
                    onFocus={selectOnFocus}
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{ width: 120 }}
                    InputProps={{
                      endAdornment: (
                        <Typography variant="caption" color="text.secondary">
                          €
                        </Typography>
                      ),
                    }}
                  />
                  <Box sx={{ flex: 1 }} />
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={method}
                    onChange={(_, v) => v && onSubBillPaymentMethodChange(bill.id, v)}
                  >
                    <ToggleButton
                      value="cash"
                      sx={{
                        px: 1.25,
                        fontWeight: 700,
                        color: 'text.secondary',
                        borderColor: 'divider',
                        '&.Mui-selected': {
                          bgcolor: 'success.main',
                          color: 'success.contrastText',
                          borderColor: 'success.dark',
                          '&:hover': { bgcolor: 'success.dark' },
                        },
                      }}
                    >
                      <CashIcon fontSize="small" sx={{ mr: 0.5 }} />
                      Espèces
                    </ToggleButton>
                    <ToggleButton
                      value="card"
                      sx={{
                        px: 1.25,
                        fontWeight: 700,
                        color: 'text.secondary',
                        borderColor: 'divider',
                        '&.Mui-selected': {
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          borderColor: 'primary.dark',
                          '&:hover': { bgcolor: 'primary.dark' },
                        },
                      }}
                    >
                      <CardIcon fontSize="small" sx={{ mr: 0.5 }} />
                      Carte
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {bill.items.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Déposez des articles ici
                  </Typography>
                ) : (
                  <List dense disablePadding>
                    {bill.items.map(item => (
                      <ListItem
                        key={item.id}
                        disablePadding
                        secondaryAction={
                          <IconButton
                            edge="end"
                            size="small"
                            aria-label="Retirer"
                            onClick={() => returnItemToPool(sourceItemId(item.id))}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        }
                      >
                        <ListItemText
                          primary={item.productName}
                          secondary={formatCurrency(item.totalPrice)}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                    mt: 1,
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {itemSum > 0
                      ? `Articles ${formatCurrency(itemSum)} + complément ${formatCurrency(manualValue)} = ${formatCurrency(bill.total)}`
                      : isResidual
                        ? 'Reste calculé automatiquement'
                        : 'Complément manuel (optionnel)'}
                  </Typography>
                  <Chip size="small" label={formatCurrency(bill.total)} color="primary" />
                  {selectedIds.size > 0 && (
                    <Button size="small" onClick={() => assignToBill([...selectedIds], index)}>
                      Ajouter sélection
                    </Button>
                  )}
                </Box>
              </Paper>
            );
          })}
        </Paper>
      </Box>

      <Alert
        severity={isValid ? 'success' : 'error'}
        variant="filled"
        sx={{
          bgcolor: isValid ? 'success.main' : 'error.main',
          color: '#fff',
          fontWeight: 700,
          '& .MuiAlert-icon': { color: '#fff' },
          '& .MuiAlert-message': { width: '100%' },
        }}
      >
        Total parts : {formatCurrency(totalSplit)}
        {' · '}
        Commande : {formatCurrency(orderTotal)}
        {' · '}
        {isValid ? '✓ Prêt à encaisser' : `Écart ${formatCurrency(Math.abs(totalSplit - orderTotal))}`}
      </Alert>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          disabled={!isValid || loading}
          onClick={onConfirm}
        >
          {loading
            ? 'Traitement…'
            : subBills.length === 1
              ? 'Confirmer le paiement'
              : 'Confirmer le partage'}
        </Button>
      </Box>
      {pool.length > 0 && isValid && (
        <Typography variant="caption" color="text.secondary">
          Des articles restent non assignés : les montants des parts seront utilisés tels quels
          (répartition par montant).
        </Typography>
      )}
      {pool.length > 0 && !isValid && (
        <Typography variant="caption" color="text.secondary">
          Assignez les articles, ou utilisez « Parts égales (montants) ».
        </Typography>
      )}

      <Menu
        open={menuAnchor != null && !pickBillsOpen}
        onClose={() => setMenuAnchor(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          menuAnchor != null ? { top: menuAnchor.mouseY, left: menuAnchor.mouseX } : undefined
        }
      >
        {subBills.map((_, index) => (
          <MenuItem
            key={`move-${index}`}
            onClick={() => menuAnchor && assignToBill(menuAnchor.itemIds, index)}
          >
            Envoyer vers Paiement {index + 1}
          </MenuItem>
        ))}
        <MenuItem
          onClick={() => {
            if (!menuAnchor) return;
            openRepartirDialog(menuAnchor.itemIds);
          }}
        >
          Répartir…
        </MenuItem>
      </Menu>

      <Dialog
        open={pickBillsOpen}
        onClose={() => {
          setPickBillsOpen(false);
          setPickAmounts({});
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Répartir</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Articles : <strong>{formatCurrency(pickItemsTotal)}</strong>
            {' — '}cochez les paiements, laissez vide pour parts égales, ou saisissez des montants
            (le dernier champ vide complète le reste).
          </Typography>
          {subBills.map((_, index) => {
            const checked = pickBillIds.has(index);
            const isRes = checked && pickResidual === index;
            const shareC = pickShares[index] ?? 0;
            const typed = (pickAmounts[index] ?? '').trim() !== '';
            const display = !checked
              ? ''
              : typed
                ? pickAmounts[index]!
                : isRes || Object.values(pickParsedAmounts).every(v => v == null)
                  ? fromCents(shareC).toFixed(2)
                  : '';
            return (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1,
                  opacity: checked ? 1 : 0.55,
                }}
              >
                <FormControlLabel
                  sx={{ mr: 0, minWidth: 130 }}
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={() => {
                        setPickBillIds(prev => {
                          const next = new Set(prev);
                          if (next.has(index)) {
                            next.delete(index);
                            setPickAmounts(a => {
                              const copy = { ...a };
                              delete copy[index];
                              return copy;
                            });
                          } else next.add(index);
                          return next;
                        });
                      }}
                    />
                  }
                  label={`Paiement ${index + 1}`}
                />
                {isRes && checked && (
                  <Chip size="small" color="info" label="Solde" variant="outlined" />
                )}
                <TextField
                  size="small"
                  label="Montant"
                  type="number"
                  disabled={!checked}
                  value={checked ? display : ''}
                  onChange={e =>
                    setPickAmounts(prev => ({ ...prev, [index]: e.target.value }))
                  }
                  onFocus={selectOnFocus}
                  inputProps={{ min: 0, step: 0.01 }}
                  sx={{ width: 120, ml: 'auto' }}
                  InputProps={{
                    endAdornment: (
                      <Typography variant="caption" color="text.secondary">
                        €
                      </Typography>
                    ),
                  }}
                />
              </Box>
            );
          })}
          {!pickSharesValid && pickBillIds.size > 0 && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              La somme des parts doit égaler {formatCurrency(pickItemsTotal)}.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPickBillsOpen(false);
              setPickAmounts({});
            }}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            disabled={!pickSharesValid || !menuAnchor}
            onClick={applyRepartir}
          >
            Répartir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SplitBoard;

/** Pool row: checkbox for multi-select; drag works without checking. */
function PoolItemRow({
  item,
  selected,
  onToggle,
  onDragStart,
  onContextMenu,
  formatCurrency,
}: {
  item: OrderItem;
  selected: boolean;
  onToggle: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  formatCurrency: (n: number) => string;
}) {
  const longPressRef = React.useRef<number | null>(null);
  const dragStarted = React.useRef(false);

  const clearLongPress = () => {
    if (longPressRef.current != null) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  return (
    <ListItem
      disablePadding
      draggable
      onDragStart={e => {
        dragStarted.current = true;
        clearLongPress();
        onDragStart(e);
      }}
      onDragEnd={() => {
        dragStarted.current = false;
      }}
      onContextMenu={onContextMenu}
      onTouchStart={e => {
        const touch = e.touches[0];
        if (!touch) return;
        clearLongPress();
        const x = touch.clientX;
        const y = touch.clientY;
        longPressRef.current = window.setTimeout(() => {
          onContextMenu({
            preventDefault() {},
            clientX: x,
            clientY: y,
          } as React.MouseEvent);
        }, 450);
      }}
      onTouchEnd={clearLongPress}
      onTouchMove={clearLongPress}
      sx={{
        mb: 0.5,
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        borderRadius: 1,
        bgcolor: selected ? 'action.selected' : 'background.paper',
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
      }}
    >
      <ListItemIcon sx={{ minWidth: 36, pl: 1 }} onClick={e => e.stopPropagation()}>
        <Checkbox
          edge="start"
          checked={selected}
          tabIndex={-1}
          disableRipple
          onChange={onToggle}
          onClick={e => e.stopPropagation()}
        />
      </ListItemIcon>
      <ListItemButton
        onClick={() => {
          // Ignore click that follows a drag
          if (dragStarted.current) {
            dragStarted.current = false;
            return;
          }
          onToggle();
        }}
        sx={{ pr: 1, cursor: 'grab' }}
      >
        <ListItemText
          primary={item.productName}
          secondary={formatCurrency(item.totalPrice)}
          primaryTypographyProps={{ fontWeight: 600 }}
        />
      </ListItemButton>
    </ListItem>
  );
}
