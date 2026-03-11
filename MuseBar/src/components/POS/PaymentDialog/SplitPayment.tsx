/**
 * Split Payment Component
 * Handles split payment functionality for multiple payers
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  Group as GroupIcon,
  Calculate as CalculateIcon,
  Refresh as RefreshIcon,
  CreditCard as CardIcon,
  LocalAtm as CashIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { SplitPaymentProps } from './types';
import { formatCurrency } from '../../../utils/formatCurrency';
import type { OrderItem } from '../../../types';

/**
 * Split Payment Component
 */
export const SplitPayment: React.FC<SplitPaymentProps> = ({
  orderTotal,
  currentOrder,
  splitType,
  splitCount,
  subBills,
  onSplitTypeChange,
  onSplitCountChange,
  onSubBillsChange,
  onSubBillPaymentMethodChange,
  onInitialize,
  loading,
  onConfirm,
}) => {
  const [customSubMode, setCustomSubMode] = useState<'amount' | 'items'>('amount');
  const [addToBillIndex, setAddToBillIndex] = useState<Record<string, number>>({});
  const totalSplit = subBills.reduce((sum, bill) => sum + bill.total, 0);
  const isValidSplit = Math.round(totalSplit * 100) === Math.round(orderTotal * 100);

  const assignedItemIds = new Set(
    subBills.flatMap(b => b.items.map(i => i.id))
  );
  const unassignedItems = currentOrder.filter(item => !assignedItemIds.has(item.id));
  const allItemsAssigned = currentOrder.length > 0 && unassignedItems.length === 0;
  const isValidByItems = allItemsAssigned && isValidSplit;

  const assignItemToBill = useCallback(
    (billIndex: number, item: OrderItem) => {
      const updated = subBills.map((bill, i) => {
        if (i !== billIndex) {
          const items = bill.items.filter(x => x.id !== item.id);
          const total = items.reduce((s, x) => s + x.totalPrice, 0);
          return {
            ...bill,
            items,
            total,
            payments:
              bill.payments.length > 0
                ? [{ ...bill.payments[0], amount: total }]
                : [{ amount: total, method: 'card' as const }],
          };
        }
        const items = [...bill.items, item];
        const total = items.reduce((s, x) => s + x.totalPrice, 0);
        return {
          ...bill,
          items,
          total,
          payments:
            bill.payments.length > 0
              ? [{ ...bill.payments[0], amount: total }]
              : [{ amount: total, method: 'card' as const }],
        };
      });
      onSubBillsChange(updated);
    },
    [subBills, onSubBillsChange]
  );

  const removeItemFromBill = useCallback(
    (billIndex: number, itemId: string) => {
      const updated = subBills.map((bill, i) => {
        if (i !== billIndex) return bill;
        const items = bill.items.filter(x => x.id !== itemId);
        const total = items.reduce((s, x) => s + x.totalPrice, 0);
        return {
          ...bill,
          items,
          total,
          payments:
            bill.payments.length > 0
              ? [{ ...bill.payments[0], amount: total }]
              : [{ amount: total, method: 'card' as const }],
        };
      });
      onSubBillsChange(updated);
    },
    [subBills, onSubBillsChange]
  );

  const handleSwitchToByItems = useCallback(() => {
    setCustomSubMode('items');
    onSubBillsChange(
      subBills.map(b => ({
        ...b,
        items: [],
        total: 0,
        payments: [{ amount: 0, method: 'card' as const }],
      }))
    );
  }, [subBills, onSubBillsChange]);

  const handleSwitchToByAmount = useCallback(() => {
    setCustomSubMode('amount');
    onSubBillsChange(
      subBills.map(b => {
        const total = b.items.reduce((s, x) => s + x.totalPrice, 0);
        return {
          ...b,
          total,
          payments:
            b.payments.length > 0
              ? [{ ...b.payments[0], amount: total }]
              : [{ amount: total, method: 'card' as const }],
        };
      })
    );
  }, [subBills, onSubBillsChange]);

  const handleCustomAmountChange = (index: number, raw: string) => {
    const value = parseFloat(raw.replace(',', '.'));
    const safeAmount = Number.isFinite(value) && value > 0 ? value : 0;
    const lastIndex = subBills.length - 1;

    const updated = subBills.map((bill, i) =>
      i === index
            ? {
                ...bill,
                total: safeAmount,
                payments:
                  bill.payments.length > 0
                    ? [{ ...bill.payments[0], amount: safeAmount }]
                    : [{ amount: safeAmount, method: 'card' as const }],
              }
        : bill
    );

    // For custom splits we treat the last part as the residual amount.
    if (index !== lastIndex) {
      const othersTotal = updated
        .slice(0, lastIndex)
        .reduce((sum, bill) => sum + bill.total, 0);
      const remaining = Math.max(0, orderTotal - othersTotal);
      updated[lastIndex] = {
          ...updated[lastIndex],
          total: remaining,
          payments:
            updated[lastIndex].payments.length > 0
              ? [{ ...updated[lastIndex].payments[0], amount: remaining }]
              : [{ amount: remaining, method: 'card' as const }],
        };
    }

    onSubBillsChange(updated);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <GroupIcon />
        Paiement partagé
      </Typography>

      {/* Split Configuration */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Type de partage
        </Typography>
        
        <RadioGroup
          value={splitType}
          onChange={(e) => onSplitTypeChange(e.target.value as 'equal' | 'custom')}
        >
          <FormControlLabel
            value="equal"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body1">Partage égal</Typography>
                <Typography variant="caption" color="text.secondary">
                  Divise la commande en parts égales
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            value="custom"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body1">Partage personnalisé</Typography>
                <Typography variant="caption" color="text.secondary">
                  Configure manuellement chaque paiement
                </Typography>
              </Box>
            }
          />
        </RadioGroup>
      </Box>

      {/* Number of Splits */}
      <Box sx={{ mb: 3 }}>
        <TextField
          label="Nombre de paiements"
          type="number"
          value={splitCount}
          onChange={(e) => onSplitCountChange(parseInt(e.target.value) || 2)}
          inputProps={{ min: 2, max: 10, onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select() }}
          sx={{ maxWidth: 200 }}
          helperText="Entre 2 et 10 paiements"
        />
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onInitialize}
          sx={{ ml: 2, mt: 2 }}
        >
          Initialiser
        </Button>
      </Box>

      {/* Custom split: by amount vs by items */}
      {splitType === 'custom' && subBills.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Répartition
          </Typography>
          <ToggleButtonGroup
            value={customSubMode}
            exclusive
            onChange={(_, v) => {
              if (v === 'items') handleSwitchToByItems();
              else if (v === 'amount') handleSwitchToByAmount();
            }}
            size="small"
          >
            <ToggleButton value="amount">Par montant</ToggleButton>
            <ToggleButton value="items">Par articles</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Item assignment list for custom split by items (unassigned only) */}
      {splitType === 'custom' && customSubMode === 'items' && currentOrder.length > 0 && subBills.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Articles à assigner
          </Typography>
          {unassignedItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 1 }}>
              Tous les articles sont assignés.
            </Typography>
          ) : (
            <List dense>
              {unassignedItems.map(item => {
                const selectedIndex = addToBillIndex[item.id] ?? 0;
                return (
                  <ListItem
                    key={item.id}
                    sx={{
                      bgcolor: 'grey.50',
                      mb: 0.5,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.300',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <ListItemText
                      primary={item.productName}
                      secondary={`x${item.quantity} — ${formatCurrency(item.totalPrice)}`}
                    />
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <InputLabel>Paiement</InputLabel>
                      <Select
                        label="Paiement"
                        value={String(selectedIndex)}
                        onChange={e => setAddToBillIndex(prev => ({ ...prev, [item.id]: parseInt(e.target.value, 10) }))}
                      >
                        {subBills.map((_, index) => (
                          <MenuItem key={subBills[index].id} value={String(index)}>
                            {`Paiement ${index + 1}`}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => assignItemToBill(selectedIndex, item)}
                      aria-label="Ajouter à ce paiement"
                      title="Ajouter à ce paiement"
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
      )}

      {/* Split Summary */}
      {subBills.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalculateIcon />
            Détails des paiements
          </Typography>
          
          <List>
            {subBills.map((bill, index) => {
              const method = bill.payments[0]?.method ?? 'card';
              return (
                <ListItem
                  key={bill.id}
                  sx={{
                    bgcolor: 'grey.50',
                    mb: 1,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'grey.300',
                    flexWrap: 'wrap',
                    display: 'block',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                    <ListItemText
                      primary={`Paiement ${index + 1}`}
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          {splitType === 'custom' && customSubMode === 'items' ? (
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Articles dans ce paiement:
                              </Typography>
                              {bill.items.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  Aucun article
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
                                          onClick={() => removeItemFromBill(index, item.id)}
                                          aria-label="Retirer du paiement"
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      }
                                    >
                                      <ListItemText
                                        primary={`${item.productName} — ${formatCurrency(item.totalPrice)}`}
                                        primaryTypographyProps={{ variant: 'body2' }}
                                      />
                                    </ListItem>
                                  ))}
                                </List>
                              )}
                              <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5 }}>
                                Sous-total: {formatCurrency(bill.total)}
                              </Typography>
                            </Box>
                          ) : splitType === 'custom' ? (
                            <TextField
                              label="Montant"
                              type="number"
                              size="small"
                              value={index === subBills.length - 1 ? bill.total.toFixed(2) : bill.total || ''}
                              onChange={e => {
                                if (index !== subBills.length - 1) {
                                  handleCustomAmountChange(index, e.target.value);
                                }
                              }}
                              inputProps={{ min: 0, step: 0.01 }}
                              sx={{ maxWidth: 140, mb: 1 }}
                              helperText={
                                index === subBills.length - 1
                                  ? 'Calculé automatiquement'
                                  : 'Saisir le montant pour ce payeur'
                              }
                              disabled={splitType !== 'custom' || (index === subBills.length - 1)}
                            />
                          ) : (
                            <Typography variant="body2">
                              Montant: {formatCurrency(bill.total)}
                            </Typography>
                          )}
                          {splitType === 'equal' && (
                            <Typography variant="body2" color="textSecondary">
                              Articles: {bill.items.length}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  {onSubBillPaymentMethodChange && (
                    <ToggleButtonGroup
                      value={method}
                      exclusive
                      onChange={(_, value) => value != null && onSubBillPaymentMethodChange(bill.id, value)}
                      size="small"
                      sx={{ ml: 1 }}
                      aria-label={`Mode de paiement pour paiement ${index + 1}`}
                    >
                      <ToggleButton value="cash" aria-label="Espèces">
                        <CashIcon sx={{ mr: 0.5 }} fontSize="small" />
                        Espèces
                      </ToggleButton>
                      <ToggleButton value="card" aria-label="Carte">
                        <CardIcon sx={{ mr: 0.5 }} fontSize="small" />
                        Carte
                      </ToggleButton>
                    </ToggleButtonGroup>
                  )}
                  <Chip
                    label={bill.payments.length > 0 ? 'Configuré' : 'En attente'}
                    color={bill.payments.length > 0 ? 'success' : 'default'}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                  </Box>
                </ListItem>
              );
            })}
          </List>

          {/* Split Validation */}
          <Box sx={{ mt: 2, p: 2, bgcolor: isValidSplit ? 'success.light' : 'error.light', borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Total partagé:</strong> {formatCurrency(totalSplit)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Montant commande:</strong> {formatCurrency(orderTotal)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography 
                  variant="body2" 
                  color={isValidSplit ? 'success.main' : 'error.main'}
                  fontWeight="bold"
                >
                  <strong>Différence:</strong> {formatCurrency(Math.abs(totalSplit - orderTotal))}
                  {isValidSplit ? ' ✓ Valide' : ' ✗ Invalide'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Box>
      )}

      {/* Validation Messages */}
      {subBills.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Cliquez sur "Initialiser" pour configurer les paiements partagés.
          </Typography>
        </Alert>
      )}

      {subBills.length > 0 && !isValidSplit && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Erreur:</strong> Le total des paiements partagés ne correspond pas au montant de la commande.
            <br />
            Veuillez ajuster les montants ou réinitialiser le partage.
          </Typography>
        </Alert>
      )}

      {splitType === 'custom' && customSubMode === 'items' && subBills.length > 0 && !allItemsAssigned && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Articles non assignés:</strong> Assignez tous les articles ({unassignedItems.length} restant
            {unassignedItems.length > 1 ? 's' : ''}) à un paiement pour valider.
          </Typography>
        </Alert>
      )}

      {subBills.length > 0 && (isValidSplit || isValidByItems) && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Partage validé:</strong> Les paiements sont correctement configurés.
            <br />
            Vous pouvez confirmer le paiement partagé.
          </Typography>
        </Alert>
      )}

      {/* Confirm Button */}
      {subBills.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            onClick={onConfirm}
            disabled={(splitType === 'custom' && customSubMode === 'items' ? !isValidByItems : !isValidSplit) || loading}
            size="large"
          >
            {loading ? 'Traitement...' : 'Confirmer le paiement partagé'}
          </Button>
        </Box>
      )}

      {/* Information */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Paiement partagé:
        </Typography>
        <Typography variant="body2">
          • Divise la commande entre plusieurs payeurs<br />
          • Chaque paiement peut utiliser une méthode différente<br />
          • Le total de tous les paiements doit égaler le montant de la commande<br />
          • Utile pour les groupes et les repas d'affaires
        </Typography>
      </Alert>
    </Box>
  );
};

export default SplitPayment;

