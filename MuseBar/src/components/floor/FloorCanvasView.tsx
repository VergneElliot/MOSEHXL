import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import {
  FLOOR_CANVAS_HEIGHT,
  FLOOR_CANVAS_WIDTH,
  FLOOR_GRID,
  clampTableRect,
  normalizeTableGeometry,
  snap,
} from './floorGeometry';
import { FloorCanvasTableNode } from './FloorCanvasTableNode';
import {
  clientToCanvasPoint,
  hitTestFloorTable,
  selectDropMovedEnough,
} from './floorSelectDropHit';

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
  /** Select mode: drag one table onto another (source → target). */
  onTableDrop?: (sourceId: number, targetId: number) => void;
  onGeometryCommit?: (
    id: number,
    geometry: { pos_x: number; pos_y: number; width: number; height: number }
  ) => void;
  snapEnabled?: boolean;
  localTables?: FloorCanvasTable[];
  onLocalTablesChange?: (tables: FloorCanvasTable[]) => void;
}

type DragKind = 'move' | 'resize' | 'pan' | 'select-drop';

/**
 * Absolute-positioned floor canvas. Edit: drag + corner resize.
 * Select: click, or drag table onto another (onTableDrop).
 * Pan: drag empty space. Zoom: Ctrl/Cmd + wheel.
 */
const FloorCanvasView: React.FC<FloorCanvasViewProps> = ({
  tables,
  mode,
  selectedId = null,
  onSelect,
  onTableDrop,
  onGeometryCommit,
  snapEnabled = true,
  localTables,
  onLocalTablesChange,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.7);
  const [pan, setPan] = useState({ x: 24, y: 24 });
  const [isPanning, setIsPanning] = useState(false);
  const [dropHoverId, setDropHoverId] = useState<number | null>(null);
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
  const onTableDropRef = useRef(onTableDrop);
  const snapEnabledRef = useRef(snapEnabled);
  const modeRef = useRef(mode);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);

  localTablesRef.current = localTables;
  tablesRef.current = tables;
  onLocalTablesChangeRef.current = onLocalTablesChange;
  onGeometryCommitRef.current = onGeometryCommit;
  onSelectRef.current = onSelect;
  onTableDropRef.current = onTableDrop;
  snapEnabledRef.current = snapEnabled;
  modeRef.current = mode;
  zoomRef.current = zoom;
  panRef.current = pan;

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

  const finishDrag = useCallback((clientX?: number, clientY?: number) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setIsPanning(false);
    setDropHoverId(null);
    if (!drag) return;

    if (drag.kind === 'pan') {
      if (drag.clearSelectionOnTap && !drag.moved && modeRef.current === 'edit') {
        onSelectRef.current?.(null);
      }
      return;
    }

    if (drag.kind === 'select-drop' && drag.tableId != null) {
      if (!drag.moved) {
        onSelectRef.current?.(drag.tableId);
        return;
      }
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport || clientX == null || clientY == null) return;
      const pt = clientToCanvasPoint(clientX, clientY, viewport, panRef.current, zoomRef.current);
      const target = hitTestFloorTable(tablesRef.current, pt.x, pt.y, drag.tableId);
      if (target) onTableDropRef.current?.(drag.tableId, target.id);
      else onSelectRef.current?.(drag.tableId);
      return;
    }

    if (drag.tableId == null || modeRef.current !== 'edit') return;
    const current = localTablesRef.current ?? tablesRef.current;
    const table = current.find((t) => t.id === drag.tableId);
    if (!table) return;
    const geo = normalizeTableGeometry(table);
    onGeometryCommitRef.current?.(drag.tableId, {
      pos_x: geo.pos_x,
      pos_y: geo.pos_y,
      width: geo.width,
      height: geo.height,
    });
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

      if (drag.kind === 'select-drop' && drag.tableId != null) {
        if (!selectDropMovedEnough(drag.startClientX, drag.startClientY, e.clientX, e.clientY)) {
          return;
        }
        drag.moved = true;
        const viewport = viewportRef.current?.getBoundingClientRect();
        if (!viewport) return;
        const pt = clientToCanvasPoint(e.clientX, e.clientY, viewport, panRef.current, zoomRef.current);
        const target = hitTestFloorTable(tablesRef.current, pt.x, pt.y, drag.tableId);
        setDropHoverId(target?.id ?? null);
        return;
      }

      if (modeRef.current !== 'edit' || drag.tableId == null) return;

      const z = zoomRef.current;
      const doSnap = snapEnabledRef.current;
      const current = localTablesRef.current ?? tablesRef.current;
      const table = current.find((t) => t.id === drag.tableId);
      if (!table) return;

      const dx = (e.clientX - drag.startClientX) / z;
      const dy = (e.clientY - drag.startClientY) / z;

      if (drag.kind === 'move') {
        const rect = clampTableRect(
          snap(drag.origX + dx, doSnap),
          snap(drag.origY + dy, doSnap),
          drag.origW,
          drag.origH
        );
        updateLocal(drag.tableId, { pos_x: rect.pos_x, pos_y: rect.pos_y });
      } else if (drag.kind === 'resize') {
        let w = snap(drag.origW + dx, doSnap);
        let h = snap(drag.origH + dy, doSnap);
        w = Math.max(40, w);
        h = Math.max(40, h);
        const rect = clampTableRect(drag.origX, drag.origY, w, h);
        updateLocal(drag.tableId, { width: rect.width, height: rect.height });
      }
    };

    const onUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      finishDrag(e.clientX, e.clientY);
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
      if (table.disabled) return;
      e.stopPropagation();
      e.preventDefault();
      dragRef.current = {
        kind: 'select-drop',
        tableId: table.id,
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
        clearSelectionOnTap: false,
      };
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

  return (
    <Box
      ref={viewportRef}
      onWheel={(e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        setZoom((z) => Math.min(2, Math.max(0.35, z + delta)));
      }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) beginPan(e, mode === 'edit');
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
          if (e.target === e.currentTarget) beginPan(e, mode === 'edit');
        }}
      >
        {displayTables.map((table) => (
          <FloorCanvasTableNode
            key={table.id}
            table={table}
            mode={mode}
            selected={selectedId === table.id}
            dropHighlight={dropHoverId === table.id}
            onPointerDownMove={(e) => beginTableDrag(e, table, 'move')}
            onPointerDownResize={(e) => {
              e.stopPropagation();
              beginTableDrag(e, table, 'resize');
            }}
          />
        ))}
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
        Zoom {Math.round(zoom * 100)}% · Ctrl+molette
        {onTableDrop ? ' · Glisser table→table pour transférer/fusionner' : ''}
      </Typography>
    </Box>
  );
};

export default FloorCanvasView;
