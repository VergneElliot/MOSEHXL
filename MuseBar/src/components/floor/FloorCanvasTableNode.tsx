import React from 'react';
import { Box, Typography } from '@mui/material';
import type { FloorCanvasTable } from './FloorCanvasView';

type FloorCanvasTableNodeProps = {
  table: FloorCanvasTable;
  mode: 'edit' | 'select';
  selected: boolean;
  onPointerDownMove: (e: React.PointerEvent) => void;
  onPointerDownResize?: (e: React.PointerEvent) => void;
  dropHighlight?: boolean;
};

export function FloorCanvasTableNode({
  table,
  mode,
  selected,
  onPointerDownMove,
  onPointerDownResize,
  dropHighlight = false,
}: FloorCanvasTableNodeProps) {
  const occupied = table.occupied === true;
  const isCircle = table.shape === 'circle';
  const borderRadius = isCircle ? '50%' : table.shape === 'square' ? 2 : 1;
  const bg =
    mode === 'select'
      ? dropHighlight
        ? 'info.light'
        : table.isActive
          ? 'primary.light'
          : occupied
            ? 'warning.light'
            : 'success.light'
      : selected
        ? 'primary.light'
        : 'grey.200';
  const borderColor = dropHighlight
    ? 'info.main'
    : table.isActive || selected
      ? 'primary.main'
      : mode === 'select'
        ? occupied
          ? 'warning.dark'
          : 'success.dark'
        : 'grey.500';

  return (
    <Box
      onPointerDown={onPointerDownMove}
      sx={{
        position: 'absolute',
        left: table.pos_x,
        top: table.pos_y,
        width: table.width,
        height: table.height,
        borderRadius,
        bgcolor: bg,
        border: '2px solid',
        borderColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: mode === 'edit' ? 'grab' : table.disabled ? 'not-allowed' : 'grab',
        opacity: table.disabled ? 0.45 : 1,
        boxShadow: selected || dropHighlight ? 3 : 1,
        px: 0.5,
        zIndex: selected || dropHighlight ? 2 : 1,
      }}
    >
      <Typography
        fontWeight={700}
        sx={{ fontSize: Math.min(18, Math.max(12, table.width / 4)), lineHeight: 1.1 }}
      >
        {table.label}
      </Typography>
      {table.capacity != null && Number(table.capacity) > 0 && (
        <Typography variant="caption" sx={{ opacity: 0.8, lineHeight: 1 }}>
          {table.capacity} p.
        </Typography>
      )}
      {mode === 'select' && (
        <Typography variant="caption" sx={{ lineHeight: 1, mt: 0.25 }}>
          {occupied ? 'Occupée' : 'Libre'}
        </Typography>
      )}
      {mode === 'edit' && selected && onPointerDownResize && (
        <Box
          onPointerDown={onPointerDownResize}
          sx={{
            position: 'absolute',
            right: -8,
            bottom: -8,
            width: 18,
            height: 18,
            bgcolor: 'primary.main',
            borderRadius: '3px',
            cursor: 'nwse-resize',
            border: '2px solid white',
            zIndex: 3,
          }}
        />
      )}
    </Box>
  );
}
