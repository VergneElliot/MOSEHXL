import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import {
  FLOOR_CANVAS_HEIGHT,
  FLOOR_CANVAS_WIDTH,
  FLOOR_GRID,
  clampTableRect,
  normalizeTableGeometry,
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

type DragKind = 'move' | 'resize' | 'pan';

/**
 * Absolute-positioned floor canvas. Edit: drag + corner resize. Select: click only.
 * Pan: drag empty space (touch-friendly). Zoom: Ctrl/Cmd + wheel.
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
  const [isPanning, setIsPanning] = useState(false);
  const dragRef = useRef<{
    kind: DragKind;
    tableId: number | null;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    panX: number;
    panY: number;
    moved: boolean;
    clearSelectionOnTap: boolean;
  } | null>(null);
  const localTablesRef = useRef(localTables);
  const tablesRef = useRef(tables);
  const onLocalTablesChangeRef = useRef(onLocalTablesChange);
  const onGeometryCommitRef = useRef(onGeometryCommit);
  const onSelectRef = useRef(onSelect);
  const snapEnabledRef = useRef(snapEnabled);
  const modeRef = useRef(mode);
  const zoomRef = useRef(zoom);

  localTablesRef.current = localTables;
  tablesRef.current = tables;
  onLocalTablesChangeRef.current = onLocalTablesChange;
  onGeometryCommitRef.current = onGeometryCommit;
  onSelectRef.current = onSelect;
  snapEnabledRef.current = snapEnabled;
  modeRef.current = mode;
  zoomRef.current = zoom;

  const displayTables = (localTables ?? tables).map((t) => ({
    ...t,
    ...normalizeTableGeometry(t),
  }));

  const updateLocal = useCallback((id: number, patch: Partial<FloorCanvasTable>) => {
    const onChange = onLocalTablesChangeRef.current;
    if (!onChange) return;
    const current = localTablesRef.current ?? tablesRef.current;
    onChange(current.map((t) => (t.id === id ? { ...t, ...normalizeTableGeometry(t), ...patch } : t)));
  }, []);

  const finishDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    setIsPanning(false);
    if (!drag) return;

    if (drag.kind === 'pan') {
      if (drag.clearSelectionOnTap && !drag.moved && modeRef.current === 'edit') {
        onSelectRef.current?.(null);
      }
      return;
    }

    if (drag.tableId == null || modeRef.current !== 'edit') return;
    const current = localTablesRef.current ?? tablesRef.current;
    const table = current.find((t) => t.id === drag.tableId);
    if (!table || !onGeometryCommitRef.current) return;
    const geo = normalizeTableGeometry(table);
    onGeometryCommitRef.current(table.id, geo);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      const absDx = Math.abs(e.clientX - drag.startClientX);
      const absDy = Math.abs(e.clientY - drag.startClientY);
      if (absDx > 4 || absDy > 4) drag.moved = true;

      if (drag.kind === 'pan') {
        setIsPanning(true);
        setPan({
          x: drag.panX + (e.clientX - drag.startClientX),
          y: drag.panY + (e.clientY - drag.startClientY),
        });
        return;
      }

      if (modeRef.current !== 'edit' || drag.tableId == null) return;
      const current = (localTablesRef.current ?? tablesRef.current).map((t) => ({
        ...t,
        ...normalizeTableGeometry(t),
      }));
      const table = current.find((t) => t.id === drag.tableId);
      if (!table) return;
      const z = zoomRef.current || 1;
      const dx = (e.clientX - drag.startClientX) / z;
      const dy = (e.clientY - drag.startClientY) / z;
      const doSnap = snapEnabledRef.current;

      if (drag.kind === 'move') {
        const rect = clampTableRect(
          snap(drag.origX + dx, doSnap),
          snap(drag.origY + dy, doSnap),
          table.width,
          table.height
        );
        updateLocal(drag.tableId, { pos_x: rect.pos_x, pos_y: rect.pos_y });
      } else if (drag.kind === 'resize') {
        const shape = (table.shape || 'rectangle') as TableShape;
        let w = snap(drag.origW + dx, doSnap);
        let h = snap(drag.origH + dy, doSnap);
        if (shape === 'square' || shape === 'circle') {
          const s = Math.max(40, Math.max(w, h));
          w = s;
          h = s;
        }
        const rect = clampTableRect(drag.origX, drag.origY, w, h);
        updateLocal(drag.tableId, { width: rect.width, height: rect.height });
      }
    };

    const onUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      finishDrag();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [finishDrag, updateLocal]);

  const beginTableDrag = (
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
    const geo = normalizeTableGeometry(table);
    onSelect?.(table.id);
    dragRef.current = {
      kind,
      tableId: table.id,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: geo.pos_x,
      origY: geo.pos_y,
      origW: geo.width,
      origH: geo.height,
      panX: pan.x,
      panY: pan.y,
      moved: false,
      clearSelectionOnTap: false,
    };
  };

  const beginPan = (e: React.PointerEvent, clearSelectionOnTap: boolean) => {
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
    e.preventDefault();
    dragRef.current = {
      kind: 'pan',
      tableId: null,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: 0,
      origY: 0,
      origW: 0,
      origH: 0,
      panX: pan.x,
      panY: pan.y,
      moved: false,
      clearSelectionOnTap,
    };
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
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          beginPan(e, mode === 'edit');
        }
      }}
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
        cursor: isPanning ? 'grabbing' : 'grab',
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
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            beginPan(e, mode === 'edit');
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
              onPointerDown={(e) => beginTableDrag(e, table, 'move')}
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
                zIndex: selected ? 2 : 1,
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
              {mode === 'edit' && selected && (
                <Box
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    beginTableDrag(e, table, 'resize');
                  }}
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
          pointerEvents: 'none',
        }}
      >
        Zoom {Math.round(zoom * 100)}% · Ctrl+molette · Glisser le fond pour déplacer le plan
      </Typography>
    </Box>
  );
};

export default FloorCanvasView;
