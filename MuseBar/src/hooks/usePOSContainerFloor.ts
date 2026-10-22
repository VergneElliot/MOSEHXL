import { useCallback, useMemo, useState } from 'react';
import { PERMISSIONS } from '@mosehxl/types';
import type { OrderItem } from '../types';
import { resolveTargetOrderItems } from '../utils/posCartSelection';
import { useFloorService } from './useFloorService';

type FloorApi = ReturnType<typeof useFloorService>;

interface UsePOSContainerFloorArgs {
  floor: FloorApi;
  currentOrder: OrderItem[];
  cartSelectedIds: Set<string>;
  floorOnError: (message: string) => void;
  ensureSession: () => Promise<unknown>;
  ensurePermission: (
    permission: string | string[],
    opts?: { title?: string; description?: string }
  ) => Promise<unknown>;
  ensureTableIntervention: () => Promise<void>;
}

export function usePOSContainerFloor({
  floor,
  currentOrder,
  cartSelectedIds,
  floorOnError,
  ensureSession,
  ensurePermission,
  ensureTableIntervention,
}: UsePOSContainerFloorArgs) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const handleValidateTableOrder = useCallback(async () => {
    try {
      await ensureSession();
      const targets = resolveTargetOrderItems(currentOrder, cartSelectedIds);
      if (targets.length === 0) {
        floorOnError('Aucun article à valider');
        return;
      }
      if (floor.activeTable) {
        await ensureTableIntervention();
      }
      if (!floor.activeTable) {
        floor.openMapForAction('validate');
        return;
      }
      await floor.validateTableOrder(currentOrder);
    } catch {
      /* session cancelled */
    }
  }, [ensureSession, floor, currentOrder, cartSelectedIds, floorOnError, ensureTableIntervention]);

  const handleAssignOrderOpen = useCallback(async () => {
    try {
      await ensureSession();
      if (resolveTargetOrderItems(currentOrder, cartSelectedIds).length === 0) {
        floorOnError('Sélectionnez au moins un article');
        return;
      }
      if (floor.activeTable) {
        await ensureTableIntervention();
      }
      setAssignDialogOpen(true);
    } catch {
      /* session cancelled */
    }
  }, [
    ensureSession,
    floor.activeTable,
    currentOrder,
    cartSelectedIds,
    floorOnError,
    ensureTableIntervention,
  ]);

  const handleSuivre = useCallback(async () => {
    try {
      await ensureSession();
      if (resolveTargetOrderItems(currentOrder, cartSelectedIds).length === 0) {
        floorOnError('Aucun article à envoyer');
        return;
      }
      if (floor.activeTable) {
        await ensureTableIntervention();
      }
      await floor.printSuivre(currentOrder);
    } catch {
      /* session cancelled */
    }
  }, [ensureSession, floor, currentOrder, cartSelectedIds, floorOnError, ensureTableIntervention]);

  const handleAssignToTable = useCallback(async () => {
    try {
      await ensureSession();
      if (floor.activeTable) {
        await ensureTableIntervention();
      }
      if (floor.activeTable) {
        floor.openMapForMoveTable();
        return;
      }
      floor.openMapForAction('assign');
    } catch {
      /* session cancelled */
    }
  }, [ensureSession, floor, ensureTableIntervention]);

  const handleMoveToTable = useCallback(
    async (table: Parameters<typeof floor.moveToTable>[0]) => {
      try {
        await ensureSession();
        await ensureTableIntervention();
        await floor.moveToTable(table);
      } catch {
        /* cancelled */
      }
    },
    [ensureSession, ensureTableIntervention, floor]
  );

  const handleAssignToWaiter = useCallback(
    async (userId: number, displayName: string) => {
      try {
        await ensurePermission(PERMISSIONS.pos_reassign_waiter, {
          title: 'Réassigner un serveur',
          description: 'PIN d’un profil autorisé à réassigner le serveur d’une table.',
        });
        await floor.assignTicketWaiter(userId, displayName);
      } catch {
        /* cancelled or denied */
      }
    },
    [ensurePermission, floor]
  );

  const handleBeforeWaiterStep = useCallback(async () => {
    await ensurePermission(PERMISSIONS.pos_reassign_waiter, {
      title: 'Réassigner un serveur',
      description: 'PIN d’un profil autorisé à réassigner le serveur d’une table.',
    });
  }, [ensurePermission]);

  const handleCloseAssignDialog = useCallback(() => {
    setAssignDialogOpen(false);
  }, []);

  return useMemo(
    () => ({
      assignDialogOpen,
      handleValidateTableOrder,
      handleAssignOrderOpen,
      handleSuivre,
      handleAssignToTable,
      handleMoveToTable,
      handleAssignToWaiter,
      handleBeforeWaiterStep,
      handleCloseAssignDialog,
    }),
    [
      assignDialogOpen,
      handleValidateTableOrder,
      handleAssignOrderOpen,
      handleSuivre,
      handleAssignToTable,
      handleMoveToTable,
      handleAssignToWaiter,
      handleBeforeWaiterStep,
      handleCloseAssignDialog,
    ]
  );
}

export type POSContainerFloorActions = ReturnType<typeof usePOSContainerFloor>;
