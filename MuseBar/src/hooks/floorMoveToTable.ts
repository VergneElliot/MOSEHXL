import type { OrderItem } from '../types';
import * as floorApi from '../services/api/floor';
import {
  isFullCartSelection,
  resolveTargetOrderItems,
  ticketLineIdsFromItems,
} from '../utils/posCartSelection';
import type { ActiveTableState, PinActorState } from '../contexts/PinSessionsContext';
import { resolveFloorMoveTargetAction } from './floorMoveTarget';

export async function runFloorMoveToTable(input: {
  table: floorApi.DiningTableStatusDto;
  activeTable: ActiveTableState | null;
  pinActor: PinActorState | null;
  currentOrder: OrderItem[];
  getActionItems: () => OrderItem[];
  getSelectedIds: () => Set<string>;
  applyTicketItemsToCart: (items: floorApi.OpenTicketItemDto[]) => void;
  setMapPurpose: (purpose: 'default' | 'validate' | 'assign' | 'move-table') => void;
  setMapDialogOpen: (open: boolean) => void;
  mergeActiveIntoTable: (table: floorApi.DiningTableStatusDto) => Promise<void>;
  transferActiveToTable: (
    diningTableId: number,
    label: string,
    floorPlanId: number
  ) => Promise<void>;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
}): Promise<void> {
  const {
    table,
    activeTable,
    pinActor,
    currentOrder,
    getActionItems,
    getSelectedIds,
    applyTicketItemsToCart,
    setMapPurpose,
    setMapDialogOpen,
    mergeActiveIntoTable,
    transferActiveToTable,
    onError,
    onInfo,
  } = input;

  if (!activeTable || !pinActor) {
    onError('Table active requise pour déplacer des articles');
    return;
  }
  const sale = getActionItems();
  if (sale.length === 0) {
    onError('Aucun article à déplacer');
    return;
  }
  const fullMove = isFullCartSelection(currentOrder, getSelectedIds());
  try {
    const { items: saved } = await floorApi.replaceTicketItems(
      activeTable.ticketId,
      currentOrder,
      pinActor.token
    );
    const synced = floorApi.mapTicketItemsToOrderItems(saved);
    const tips = currentOrder.filter((line) => line.isTip);
    const syncedOrder = [...synced, ...tips];
    const targets = resolveTargetOrderItems(syncedOrder, getSelectedIds());
    const lineIds = ticketLineIdsFromItems(targets);

    if (!fullMove && lineIds.length > 0) {
      const result = await floorApi.moveTicketLines(
        activeTable.ticketId,
        table.id,
        lineIds,
        pinActor.token
      );
      applyTicketItemsToCart(result.source_items);
      setMapPurpose('default');
      setMapDialogOpen(false);
      onInfo(
        `${lineIds.length} article(s) déplacé(s) vers la table ${
          result.target_table_label ?? table.label
        }`
      );
      return;
    }

    const moveAction = resolveFloorMoveTargetAction(table, activeTable.ticketId);
    if (moveAction === 'merge') {
      await mergeActiveIntoTable(table);
      return;
    }
    if (moveAction === 'transfer') {
      await transferActiveToTable(table.id, table.label, table.floor_plan_id);
      return;
    }
    onError('Choisissez une autre table');
  } catch (error: unknown) {
    const err = error as { message?: string };
    onError(err.message || 'Déplacement impossible');
  }
}
