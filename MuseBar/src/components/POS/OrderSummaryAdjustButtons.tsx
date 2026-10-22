import React from 'react';
import { Button } from '@mui/material';
import {
  LocalOffer as OffertIcon,
  Person as PersoIcon,
  StickyNote2 as NoteIcon,
  Percent as RemiseIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material/styles';

interface OrderSummaryAdjustButtonsProps {
  actionBtnSx: SxProps<Theme>;
  hasTargets: boolean;
  canNote: boolean;
  remiseIndices: number[];
  onApplyHappyHour?: (index: number) => void;
  onApplyOffert?: (index: number) => void;
  onApplyPerso?: (index: number) => void;
  onApplyRemise?: (indices: number[]) => void;
  onUpdateLineNote?: (index: number, note: string) => void;
  applyToTargets: (fn?: (index: number) => void) => void;
  onOpenNotes: () => void;
}

const OrderSummaryAdjustButtons: React.FC<OrderSummaryAdjustButtonsProps> = ({
  actionBtnSx,
  hasTargets,
  canNote,
  remiseIndices,
  onApplyHappyHour,
  onApplyOffert,
  onApplyPerso,
  onApplyRemise,
  onUpdateLineNote,
  applyToTargets,
  onOpenNotes,
}) => (
  <>
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
    {onApplyRemise && (
      <Button
        variant="outlined"
        color="secondary"
        fullWidth
        disabled={!hasTargets}
        startIcon={<RemiseIcon />}
        onClick={() => onApplyRemise(remiseIndices)}
        sx={actionBtnSx}
      >
        Remise
      </Button>
    )}
    {onUpdateLineNote && (
      <Button
        variant="outlined"
        color="warning"
        fullWidth
        disabled={!canNote}
        startIcon={<NoteIcon />}
        onClick={onOpenNotes}
        sx={actionBtnSx}
      >
        Notes
      </Button>
    )}
  </>
);

export default OrderSummaryAdjustButtons;
