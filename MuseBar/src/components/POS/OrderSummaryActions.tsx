import React from 'react';
import {
  Box,
  Button,
  Divider,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  LocalAtm as CashIcon,
  Settings as OptionsIcon,
  TableRestaurant as TableIcon,
  Schedule as SuivreIcon,
  Done as ValidateIcon,
  SwapHoriz as AssignIcon,
} from '@mui/icons-material';
import { posActionButtonSx } from './posActionButtonSx';
import OrderSummaryAdjustButtons from './OrderSummaryAdjustButtons';

interface OrderSummaryActionsProps {
  isMobile: boolean;
  selectedCount: number;
  hasTargets: boolean;
  hasTargetItems: boolean;
  hasPendingTableValidation: boolean;
  canNote: boolean;
  canProcessPayment: boolean;
  activeTableLabel?: string | null;
  onApplyHappyHour?: (index: number) => void;
  onApplyOffert?: (index: number) => void;
  onApplyPerso?: (index: number) => void;
  onApplyRemise?: (indices: number[]) => void;
  onUpdateLineNote?: (index: number, note: string) => void;
  onCheckout: () => void;
  onQuickCard?: () => void;
  onQuickCash?: () => void;
  onValidateTableOrder?: () => void;
  onAssignOrder?: () => void;
  onSelectTable?: () => void;
  onSuivre?: () => void;
  applyToTargets: (fn?: (index: number) => void) => void;
  remiseIndices: number[];
  onOpenNotes: () => void;
}

const OrderSummaryActions: React.FC<OrderSummaryActionsProps> = ({
  isMobile,
  selectedCount,
  hasTargets,
  hasTargetItems,
  hasPendingTableValidation,
  canNote,
  canProcessPayment,
  activeTableLabel = null,
  onApplyHappyHour,
  onApplyOffert,
  onApplyPerso,
  onApplyRemise,
  onUpdateLineNote,
  onCheckout,
  onQuickCard,
  onQuickCash,
  onValidateTableOrder,
  onAssignOrder,
  onSelectTable,
  onSuivre,
  applyToTargets,
  remiseIndices,
  onOpenNotes,
}) => {
  const actionBtnSx = posActionButtonSx(isMobile);

  return (
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
        {selectedCount === 0
          ? 'Aucune sélection → toute la commande'
          : `${selectedCount} ligne(s) sélectionnée(s)`}
      </Typography>

      <OrderSummaryAdjustButtons
        actionBtnSx={actionBtnSx}
        hasTargets={hasTargets}
        canNote={canNote}
        remiseIndices={remiseIndices}
        onApplyHappyHour={onApplyHappyHour}
        onApplyOffert={onApplyOffert}
        onApplyPerso={onApplyPerso}
        onApplyRemise={onApplyRemise}
        onUpdateLineNote={onUpdateLineNote}
        applyToTargets={applyToTargets}
        onOpenNotes={onOpenNotes}
      />

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
        startIcon={<OptionsIcon />}
        onClick={onCheckout}
        sx={{ ...actionBtnSx, justifyContent: 'center' }}
      >
        Options de paiement
      </Button>

      {onValidateTableOrder && (
        <Tooltip
          title={
            activeTableLabel
              ? 'Valider la commande table (cuisine, sans encaissement)'
              : 'Choisir une table puis valider la commande'
          }
        >
          <span>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              disabled={!hasPendingTableValidation}
              startIcon={<ValidateIcon />}
              onClick={onValidateTableOrder}
              sx={{ ...actionBtnSx, justifyContent: 'center' }}
            >
              Valider commande table
            </Button>
          </span>
        </Tooltip>
      )}

      {onAssignOrder && (
        <Button
          variant="outlined"
          fullWidth
          disabled={!hasTargetItems}
          startIcon={<AssignIcon />}
          onClick={onAssignOrder}
          sx={actionBtnSx}
        >
          Assigner à
        </Button>
      )}

      <Divider sx={{ my: 0.5 }} />

      <Tooltip title={activeTableLabel ? `Table ${activeTableLabel}` : 'Plan de salle'}>
        <span>
          <Button
            variant="outlined"
            fullWidth
            disabled={!onSelectTable}
            startIcon={<TableIcon />}
            onClick={onSelectTable}
            sx={actionBtnSx}
          >
            {activeTableLabel ? `Table ${activeTableLabel}` : 'Sélectionner une table'}
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={onSuivre ? 'Envoyer en cuisine (sans encaisser)' : 'Badge requis'}>
        <span>
          <Button
            variant="outlined"
            fullWidth
            disabled={!onSuivre || !hasTargetItems}
            startIcon={<SuivreIcon />}
            onClick={onSuivre}
            sx={actionBtnSx}
          >
            À suivre
          </Button>
        </span>
      </Tooltip>
    </Box>
  );
};

export default OrderSummaryActions;
