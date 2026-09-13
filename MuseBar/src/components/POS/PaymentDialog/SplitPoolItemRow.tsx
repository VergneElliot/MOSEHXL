import React, { useEffect, useRef } from 'react';
import {
  Checkbox,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import type { OrderItem } from '../../../types';
import { usePosTouchDrag } from '../usePosTouchDrag';
import {
  POS_TOUCH_CONTEXT_MENU_DELAY_MS,
  POS_TOUCH_DRAG_TOLERANCE_PX,
} from '../posTouchDnD';
import { SPLIT_DND_MIME } from './splitDnD';

type SplitPoolItemRowProps = {
  item: OrderItem;
  selected: boolean;
  dragIds: string[];
  dragLabel: string;
  onToggle: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  formatCurrency: (n: number) => string;
};

/** Pool row: checkbox multi-select; HTML5 + shared 500ms touch drag. */
export function SplitPoolItemRow({
  item,
  selected,
  dragIds,
  dragLabel,
  onToggle,
  onDragStart,
  onContextMenu,
  formatCurrency,
}: SplitPoolItemRowProps) {
  const hostRef = useRef<HTMLLIElement | null>(null);
  const longPressRef = useRef<number | null>(null);
  const dragStarted = useRef(false);
  const dragIdsRef = useRef(dragIds);
  dragIdsRef.current = dragIds;
  const dragLabelRef = useRef(dragLabel);
  dragLabelRef.current = dragLabel;

  const clearLongPress = () => {
    if (longPressRef.current != null) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  usePosTouchDrag(
    hostRef,
    () => ({
      mime: SPLIT_DND_MIME,
      data: JSON.stringify(dragIdsRef.current),
      label: dragLabelRef.current,
    }),
    {
      onArmed: () => {
        clearLongPress();
        dragStarted.current = true;
      },
      onEnded: () => {
        window.setTimeout(() => {
          dragStarted.current = false;
        }, 0);
      },
    }
  );

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (!touch) return;
      clearLongPress();
      startX = touch.clientX;
      startY = touch.clientY;
      const x = touch.clientX;
      const y = touch.clientY;
      longPressRef.current = window.setTimeout(() => {
        longPressRef.current = null;
        onContextMenu({
          preventDefault() {},
          clientX: x,
          clientY: y,
        } as React.MouseEvent);
      }, POS_TOUCH_CONTEXT_MENU_DELAY_MS);
    };

    const onMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      if (Math.hypot(touch.clientX - startX, touch.clientY - startY) > POS_TOUCH_DRAG_TOLERANCE_PX) {
        clearLongPress();
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', clearLongPress, { passive: true });
    el.addEventListener('touchcancel', clearLongPress, { passive: true });
    return () => {
      clearLongPress();
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', clearLongPress);
      el.removeEventListener('touchcancel', clearLongPress);
    };
  }, [onContextMenu]);

  return (
    <ListItem
      ref={hostRef}
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
      <ListItemIcon sx={{ minWidth: 36, pl: 1 }} onClick={e => e.stopPropagation()} data-no-touch-drag>
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
