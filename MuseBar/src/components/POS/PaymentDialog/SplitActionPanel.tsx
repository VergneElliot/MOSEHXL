import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { CallSplit as SplitIcon } from '@mui/icons-material';

type SplitActionPanelProps = {
  billCount: number;
  hasSelection: boolean;
  onEqualAmounts: () => void;
  onAssignToBill: (billIndex: number) => void;
  onRepartir: () => void;
};

/** Middle column: Parts égales + assign / répartir for the pool selection. */
export function SplitActionPanel({
  billCount,
  hasSelection,
  onEqualAmounts,
  onAssignToBill,
  onRepartir,
}: SplitActionPanelProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        minHeight: 280,
        alignSelf: 'stretch',
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
        Actions
      </Typography>
      <Button
        variant="outlined"
        fullWidth
        startIcon={<SplitIcon />}
        onClick={onEqualAmounts}
        sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
      >
        Parts égales
      </Button>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.5 }}>
        {Array.from({ length: billCount }, (_, index) => (
          <Button
            key={index}
            size="small"
            variant="contained"
            fullWidth
            disabled={!hasSelection}
            onClick={() => onAssignToBill(index)}
            sx={{ textTransform: 'none' }}
          >
            → Paiement {index + 1}
          </Button>
        ))}
        <Button
          size="small"
          variant="outlined"
          fullWidth
          disabled={!hasSelection}
          onClick={onRepartir}
          sx={{ textTransform: 'none' }}
        >
          Répartir…
        </Button>
      </Box>
      {!hasSelection && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto' }}>
          Cochez des articles à gauche pour les envoyer vers un paiement.
        </Typography>
      )}
    </Paper>
  );
}
