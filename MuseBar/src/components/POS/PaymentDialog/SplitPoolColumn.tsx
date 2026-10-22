import React from 'react';
import { Checkbox, FormControlLabel, List, Typography } from '@mui/material';
import type { OrderItem } from '../../../types';
import { formatCurrency } from '../../../utils/formatCurrency';
import { SplitPoolItemRow } from './SplitPoolItemRow';
import { SplitPoolDropPaper } from './SplitPoolDropPaper';

interface SplitPoolColumnProps {
  pool: OrderItem[];
  selectedIds: Set<string>;
  allPoolSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onDragStart: (event: React.DragEvent, itemId: string) => void;
  onContextMenu: (event: React.MouseEvent, itemIds: string[]) => void;
  onReturnIds: (ids: string[]) => void;
}

const SplitPoolColumn: React.FC<SplitPoolColumnProps> = ({
  pool,
  selectedIds,
  allPoolSelected,
  onToggleAll,
  onToggleOne,
  onDragStart,
  onContextMenu,
  onReturnIds,
}) => (
  <SplitPoolDropPaper
    variant="outlined"
    onReturnIds={onReturnIds}
    sx={{ p: 1.5, display: 'flex', flexDirection: 'column', minHeight: 280 }}
  >
    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
      Articles de la commande
    </Typography>
    <FormControlLabel
      control={
        <Checkbox
          checked={allPoolSelected}
          indeterminate={selectedIds.size > 0 && !allPoolSelected}
          onChange={onToggleAll}
          disabled={pool.length === 0}
        />
      }
      label="Tout sélectionner"
    />
    {pool.length === 0 ? (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 1 }}>
        Tous les articles sont assignés — déposez ici pour les retirer d’un paiement.
      </Typography>
    ) : (
      <List dense sx={{ overflow: 'auto', flex: 1 }}>
        {pool.map(item => {
          const dragIds =
            selectedIds.has(item.id) && selectedIds.size > 1
              ? [...selectedIds]
              : [item.id];
          const dragLabel =
            dragIds.length === 1
              ? item.productName
              : `${dragIds.length} articles`;
          return (
            <SplitPoolItemRow
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              dragIds={dragIds}
              dragLabel={dragLabel}
              onToggle={() => onToggleOne(item.id)}
              onDragStart={e => onDragStart(e, item.id)}
              onContextMenu={e => {
                const ids = selectedIds.has(item.id) ? [...selectedIds] : [item.id];
                onContextMenu(e, ids);
              }}
              formatCurrency={formatCurrency}
            />
          );
        })}
      </List>
    )}
    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
      Glisser vers un paiement (ou d’un paiement à un autre). Clic droit / appui long pour le
      menu.
    </Typography>
  </SplitPoolDropPaper>
);

export default SplitPoolColumn;
