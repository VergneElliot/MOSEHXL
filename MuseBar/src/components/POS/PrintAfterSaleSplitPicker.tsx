import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { formatCurrency } from '../../utils/formatCurrency';

export type SplitPartOption = {
  id: number;
  payment_method: string;
  amount: number;
};

type Props = {
  parts: SplitPartOption[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
};

/** null = whole order; otherwise one sub_bill id. */
export function PrintAfterSaleSplitPicker({ parts, selectedId, onSelect }: Props) {
  if (parts.length === 0) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Partage — document pour
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button
          size="small"
          variant={selectedId == null ? 'contained' : 'outlined'}
          onClick={() => onSelect(null)}
        >
          Commande entière
        </Button>
        {parts.map((part, index) => {
          const method = part.payment_method === 'cash' ? 'Espèces' : 'Carte';
          return (
            <Button
              key={part.id}
              size="small"
              variant={selectedId === part.id ? 'contained' : 'outlined'}
              onClick={() => onSelect(part.id)}
            >
              Paiement {index + 1}/{parts.length} · {method} · {formatCurrency(part.amount)}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
}
