import React, { useRef } from 'react';
import { IconButton, ListItem, ListItemText } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import type { OrderItem } from '../../../types';
import { usePosTouchDrag } from '../usePosTouchDrag';
import { setCompactDragGhost } from '../posDragGhost';
import { SPLIT_DND_MIME } from './splitDnD';
import { sourceItemId } from './splitAssignment';

type SplitBillItemRowProps = {
  item: OrderItem;
  formatCurrency: (n: number) => string;
  onReturnToPool: () => void;
};

/** Assigned bill line: HTML5 + touch drag to another bill (payload = source item id). */
export function SplitBillItemRow({ item, formatCurrency, onReturnToPool }: SplitBillItemRowProps) {
  const hostRef = useRef<HTMLLIElement | null>(null);
  const sourceId = sourceItemId(item.id);

  usePosTouchDrag(hostRef, () => ({
    mime: SPLIT_DND_MIME,
    data: JSON.stringify([sourceId]),
    label: item.productName,
  }));

  return (
    <ListItem
      ref={hostRef}
      disablePadding
      draggable
      onDragStart={e => {
        e.dataTransfer.setData(SPLIT_DND_MIME, JSON.stringify([sourceId]));
        e.dataTransfer.effectAllowed = 'move';
        setCompactDragGhost(e, item.productName);
      }}
      secondaryAction={
        <IconButton
          edge="end"
          size="small"
          aria-label="Retirer"
          data-no-touch-drag
          onClick={onReturnToPool}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      }
      sx={{
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
        pr: 6,
      }}
    >
      <ListItemText
        primary={item.productName}
        secondary={formatCurrency(item.totalPrice)}
        primaryTypographyProps={{ variant: 'body2' }}
      />
    </ListItem>
  );
}
