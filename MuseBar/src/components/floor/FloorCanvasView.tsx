import React, { useCallback, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import {
  FLOOR_CANVAS_HEIGHT,
  FLOOR_CANVAS_WIDTH,
  FLOOR_GRID,
  clampTableRect,
  snap,
  type TableShape,
} from './floorGeometry';

export interface FloorCanvasTable {
  id: number;
  label: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  shape: string;
  capacity?: number | null;
  occupied?: boolean;
  isActive?: boolean;
  disabled?: boolean;
}

interface FloorCanvasViewProps {
  tables: FloorCanvasTable[];
  mode: 'edit' | 'select';
  selectedId?: number | null;
  onSelect?: (id: number | null) => void;
  onGeometryCommit?: (
    id: number,
    geometry: { pos_x: number; pos_y: number; width: number; height: number }
  ) => void;
  snapEnabled?: boolean;
  localTables?: FloorCanvasTable[];
  onLocalTablesChange?: (tables: FloorCanvasTable[]) => void;
}

type DragKind = 'move' | 'resize' | 'pan' | null;

/**
 * Absolute-positioned floor canvas. Edit: drag + corner resize. Select: click only.
 * Pan: Shift+drag or middle mouse. Zoom: Ctrl/Cmd + wheel.
 */
const FloorCanvasView: React.FC<FloorCanvasViewProps> = ({
  tables,
  mode,
  selectedId = null,
  onSelect,
  onGeometryCommit,
  snapEnabled = true,
  localTables,
  onLocalTablesChange,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.7);
  const [pan, setPan] = useState({ x: 24, y: 24 });
  const dragRef = useRef<{
    kind: DragKind;
    tableId: number | null;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    panX: number;
    panY: number;
  } | null>(null);

  const displayTables = localTables ?? tables;

  const updateLocal = useCallback(
    (id: number, patch: Partial<FloorCanvasTable>) => {
      if (!onLocalTablesChange) return;
      onLocalTablesChange(
        displayTables.map((t) => (t.id === id ? { ...t, ...patch } : t))
      );
    },
    [displayTables, onLocalTablesChange]
  );

  const startPan = (e: React.PointerEvent) => {
    dragRef.current = {
      kind: 'pan',
      tableId: null,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: 0,
      origY: 0,
      origW: 0,
      origH: 0,
      panX: pan.x,
      panY: pan.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerDownTable = (
    e: React.PointerEvent,
    table: FloorCanvasTable,
    kind: 'move' | 'resize'
  ) => {
    if (mode === 'select') {
      if (!table.disabled) onSelect?.(table.id);
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    onSelect?.(table.id);
    dragRef.current = {
      kind,
      tableId: table.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: table.pos_x,
      origY: table.pos_y,
      origW: table.width,
      origH: table.height,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.kind === 'pan') {
      setPan({
        x: drag.panX + (e.clientX - drag.startClientX),
        y: drag.panY + (e.clientY - drag.startClientY),
      });
      return;
    }

    if (mode !== 'edit' || drag.tableId == null) return;
    const table = displayTables.find((t) => t.id === drag.tableId);
    if (!table) return;
    const dx = (e.clientX - drag.startClientX) / zoom;
    const dy = (e.clientY - drag.startClientY) / zoom;

    if (drag.kind === 'move') {
      const rect = clampTableRect(
        snap(drag.origX + dx, snapEnabled),
        snap(drag.origY + dy, snapEnabled),
        table.width,
        table.height
      );
      updateLocal(drag.tableId, { pos_x: rect.pos_x, pos_y: rect.pos_y });
    } else if (drag.kind === 'resize') {
      const shape = (table.shape || 'rectangle') as TableShape;
      let w = snap(drag.origW + dx, snapEnabled);
      let h = snap(drag.origH + dy, snapEnabled);
      if (shape === 'square' || shape === 'circle') {
        const s = Math.max(40, Math.max(w, h));
        w = s;
        h = s;
      }
      const rect = clampTableRect(drag.origX, drag.origY, w, h);
      updateLocal(drag.tableId, { width: rect.width, height: rect.height });
    }
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.kind === 'pan' || drag.tableId == null || mode !== 'edit') return;
    const table = (localTables ?? tables).find((t) => t.id === drag.tableId);
    if (!table || !onGeometryCommit) return;
    onGeometryCommit(table.id, {
      pos_x: table.pos_x,
      pos_y: table.pos_y,
      width: table.width,
      height: table.height,
    });
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((z) => Math.min(2, Math.max(0.35, z + delta)));
  };

  return (
    <Box
      ref={viewportRef}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 420,
        overflow: 'hidden',
        bgcolor: 'grey.100',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: pan.x,
          top: pan.y,
          width: FLOOR_CANVAS_WIDTH,
          height: FLOOR_CANVAS_HEIGHT,
          transform: `scale(${zoom})`,
          transformOrigin: '0 0',
          bgcolor: '#f7f5f1',
          backgroundImage: snapEnabled
            ? `linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)`
            : 'none',
          backgroundSize: snapEnabled ? `${FLOOR_GRID}px ${FLOOR_GRID}px` : undefined,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
        }}
        onPointerDown={(e) => {
          if (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey)) {
            e.preventDefault();
            startPan(e);
            return;
          }
          if (e.target === e.currentTarget && mode === 'edit') {
            onSelect?.(null);
          }
        }}
      >
        {displayTables.map((table) => {
          const selected = selectedId === table.id;
          const occupied = table.occupied === true;
          const isCircle = table.shape === 'circle';
          const borderRadius = isCircle ? '50%' : table.shape === 'square' ? 2 : 1;
          const bg =
            mode === 'select'
              ? occupied
                ? 'warning.light'
                : table.isActive
                  ? 'primary.light'
                  : 'success.light'
              : selected
                ? 'primary.light'
                : 'grey.200';
          const borderColor =
            selected
              ? 'primary.main'
              : mode === 'select'
                ? occupied
                  ? 'warning.dark'
                  : 'success.dark'
                : 'grey.500';

          return (
            <Box
              key={table.id}
              onPointerDown={(e) => onPointerDownTable(e, table, 'move')}
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
                cursor: mode === 'edit' ? 'grab' : table.disabled ? 'not-allowed' : 'pointer',
                opacity: table.disabled ? 0.45 : 1,
                boxShadow: selected ? 3 : 1,
                px: 0.5,
              }}
            >
              <Typography
                fontWeight={700}
                sx={{ fontSize: Math.min(18, Math.max(12, table.width / 4)), lineHeight: 1.1 }}
              >
                {table.label}
              </Typography>
              {table.capacity != null && table.capacity > 0 && (
                <Typography variant="caption" sx={{ opacity: 0.8, lineHeight: 1 }}>
                  {table.capacity} p.
                </Typography>
              )}
              {mode === 'select' && (
                <Typography variant="caption" sx={{ lineHeight: 1, mt: 0.25 }}>
                  {occupied ? 'Occupée' : 'Libre'}
                </Typography>
              )}
              {mode === 'edit' && selected && (
                <Box
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onPointerDownTable(e, table, 'resize');
                  }}
                  sx={{
                    position: 'absolute',
                    right: -6,
                    bottom: -6,
                    width: 14,
                    height: 14,
                    bgcolor: 'primary.main',
                    borderRadius: '2px',
                    cursor: 'nwse-resize',
                    border: '1px solid white',
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          right: 8,
          bottom: 8,
          bgcolor: 'rgba(255,255,255,0.85)',
          px: 1,
          borderRadius: 1,
        }}
      >
        Zoom {Math.round(zoom * 100)}% · Ctrl+molette · Shift+glisser pour déplacer
      </Typography>
    </Box>
  );
};

export default FloorCanvasView;
