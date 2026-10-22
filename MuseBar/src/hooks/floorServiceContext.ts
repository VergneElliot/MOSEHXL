import type { MutableRefObject } from 'react';
import type { OrderItem } from '../types';
import type { OpenTicketItemDto } from '../services/api/floor';
import type { ActiveTableState, PinActorState } from '../contexts/PinSessionsContext';
import type { PinSessionPatch } from '../contexts/pinSessionsState';

export type FloorMapPurpose = 'default' | 'validate' | 'assign' | 'move-table';
export type FloorMapPendingAction = 'validate' | 'assign' | null;

/** Shared plumbing handed to each useFloorService sub-hook. */
export interface FloorServiceContext {
  pinActor: PinActorState | null;
  activeTable: ActiveTableState | null;
  currentOrder: OrderItem[];
  setCurrentOrder: (items: OrderItem[]) => void;
  updateActiveSession: (patch: PinSessionPatch) => void;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
  /** Set before a programmatic cart write so the debounced sync does not echo it back. */
  skipNextSync: MutableRefObject<boolean>;
  getActionItems: (order?: OrderItem[]) => OrderItem[];
  getSelectedIds: () => Set<string>;
  applyTicketItemsToCart: (items: OpenTicketItemDto[]) => void;
  ensureTableIntervention: () => Promise<void>;
}

/** Dialog state owned by useFloorServiceDialogs, needed by table-selection flows. */
export interface FloorServiceDialogControls {
  openPinDialog: (mode?: 'verify' | 'set') => void;
  setMapDialogOpen: (open: boolean) => void;
  setMapPurpose: (purpose: FloorMapPurpose) => void;
  pendingAfterPin: MutableRefObject<'map' | null>;
  pendingMapAction: MutableRefObject<FloorMapPendingAction>;
}
