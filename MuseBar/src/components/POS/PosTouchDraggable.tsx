import React, { useRef } from 'react';
import { usePosTouchDrag } from './usePosTouchDrag';
import type { PosTouchDragPayload } from './posTouchDnD';

type PosTouchDraggableProps = {
  className?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  getPayload: () => PosTouchDragPayload | null;
  children: React.ReactNode;
};

/** HTML5 drag for mouse + shared 500ms touch drag. */
export function PosTouchDraggable({
  className,
  style,
  draggable = true,
  onDragStart,
  getPayload,
  children,
}: PosTouchDraggableProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  usePosTouchDrag(ref, getPayload);
  return (
    <div
      ref={ref}
      className={className}
      style={style}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      {children}
    </div>
  );
}
