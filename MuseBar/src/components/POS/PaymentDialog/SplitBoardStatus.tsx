import React from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import { formatCurrency } from '../../../utils/formatCurrency';

interface SplitBoardStatusProps {
  orderTotal: number;
  totalSplit: number;
  isValid: boolean;
  loading: boolean;
  billCount: number;
  poolLength: number;
  onConfirm: () => void;
}

const SplitBoardStatus: React.FC<SplitBoardStatusProps> = ({
  orderTotal,
  totalSplit,
  isValid,
  loading,
  billCount,
  poolLength,
  onConfirm,
}) => (
  <>
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
          : billCount === 1
            ? 'Confirmer le paiement'
            : 'Confirmer le partage'}
      </Button>
    </Box>
    {poolLength > 0 && isValid && (
      <Typography variant="caption" color="text.secondary">
        Des articles restent non assignés : les montants des parts seront utilisés tels quels
        (répartition par montant).
      </Typography>
    )}
    {poolLength > 0 && !isValid && (
      <Typography variant="caption" color="text.secondary">
        Assignez les articles, ou utilisez « Parts égales (montants) ».
      </Typography>
    )}
  </>
);

export default SplitBoardStatus;
