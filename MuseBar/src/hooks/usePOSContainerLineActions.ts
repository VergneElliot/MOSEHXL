import { useCallback, useMemo, useState } from 'react';
import { PERMISSIONS } from '@mosehxl/types';
import type { OrderItem } from '../types';
import type { RemiseFormData } from '../components/POS/RemiseDialog';
import { usePOSOrderAdjustments } from './usePOSOrderAdjustments';
import { useFloorService } from './useFloorService';

type FloorApi = ReturnType<typeof useFloorService>;

interface UsePOSContainerLineActionsArgs {
  currentOrder: OrderItem[];
  updateLineAt: (index: number, updates: Partial<OrderItem>) => void;
  removeFromOrder: (index: number) => void;
  clearOrder: () => void;
  floor: FloorApi;
  ensurePermission: (
    permission: string | string[],
    opts?: { title?: string; description?: string }
  ) => Promise<unknown>;
  ensureTableIntervention: () => Promise<void>;
}

export function usePOSContainerLineActions({
  currentOrder,
  updateLineAt,
  removeFromOrder,
  clearOrder,
  floor,
  ensurePermission,
  ensureTableIntervention,
}: UsePOSContainerLineActionsArgs) {
  const [remiseDialogOpen, setRemiseDialogOpen] = useState(false);
  const [remiseTargetIndices, setRemiseTargetIndices] = useState<number[]>([]);

  const { handleApplyHappyHour, handleApplyOffert, handleApplyPerso, handleApplyRemise } =
    usePOSOrderAdjustments({
      currentOrder,
      updateLineAt,
    });

  const handleRequestRemise = useCallback(
    async (indices: number[]) => {
      try {
        if (floor.activeTable) await ensureTableIntervention();
        await ensurePermission(PERMISSIONS.pos_apply_remise, {
          title: 'Remise',
          description: 'PIN d’un profil autorisé à appliquer une remise.',
        });
        setRemiseTargetIndices(indices);
        setRemiseDialogOpen(true);
      } catch {
        /* cancelled */
      }
    },
    [ensurePermission, floor.activeTable, ensureTableIntervention]
  );

  const handleConfirmRemise = useCallback(
    (data: RemiseFormData) => {
      remiseTargetIndices.forEach((index) => handleApplyRemise(index, data));
      setRemiseTargetIndices([]);
    },
    [remiseTargetIndices, handleApplyRemise]
  );

  const handleCloseRemiseDialog = useCallback(() => {
    setRemiseDialogOpen(false);
    setRemiseTargetIndices([]);
  }, []);

  const gatedApplyHappyHour = useCallback(
    async (index: number) => {
      try {
        if (floor.activeTable) await ensureTableIntervention();
        await ensurePermission(PERMISSIONS.pos_happyhour_manual, {
          title: 'Happy Hour manuel',
          description: 'PIN d’un profil autorisé au Happy Hour manuel.',
        });
        handleApplyHappyHour(index);
      } catch {
        /* cancelled or denied */
      }
    },
    [ensurePermission, handleApplyHappyHour, floor.activeTable, ensureTableIntervention]
  );

  const gatedApplyOffert = useCallback(
    async (index: number) => {
      try {
        if (floor.activeTable) await ensureTableIntervention();
        await ensurePermission(PERMISSIONS.pos_apply_offert, {
          title: 'Offert',
          description: 'PIN d’un profil autorisé à appliquer un offert.',
        });
        handleApplyOffert(index);
      } catch {
        /* cancelled or denied */
      }
    },
    [ensurePermission, handleApplyOffert, floor.activeTable, ensureTableIntervention]
  );

  const gatedApplyPerso = useCallback(
    async (index: number) => {
      try {
        if (floor.activeTable) await ensureTableIntervention();
        await ensurePermission(PERMISSIONS.pos_apply_perso, {
          title: 'Perso',
          description: 'PIN d’un profil autorisé à appliquer un perso.',
        });
        handleApplyPerso(index);
      } catch {
        /* cancelled or denied */
      }
    },
    [ensurePermission, handleApplyPerso, floor.activeTable, ensureTableIntervention]
  );

  const handleClearOrder = useCallback(() => {
    if (floor.activeTable) {
      void floor.detachTableKeepTicket();
      return;
    }
    if (currentOrder.length > 0) {
      clearOrder();
    }
  }, [floor, currentOrder.length, clearOrder]);

  const handleRemoveItem = useCallback(
    async (index: number) => {
      const line = currentOrder[index];
      if (!line) return;
      if (
        floor.activeTable &&
        line.tableLineStatus === 'validated' &&
        line.ticketLineId != null
      ) {
        try {
          await ensureTableIntervention();
          await ensurePermission(PERMISSIONS.orders_cancel, {
            title: 'Retour article validé',
            description: 'PIN autorisé pour un article déjà validé (cuisine).',
          });
          await floor.cancelValidatedTicketLine(line.ticketLineId);
        } catch {
          /* cancelled or denied */
        }
        return;
      }
      try {
        if (floor.activeTable) await ensureTableIntervention();
      } catch {
        return;
      }
      removeFromOrder(index);
    },
    [currentOrder, floor, ensurePermission, ensureTableIntervention, removeFromOrder]
  );

  return useMemo(
    () => ({
      remiseDialogOpen,
      handleRequestRemise,
      handleConfirmRemise,
      handleCloseRemiseDialog,
      gatedApplyHappyHour,
      gatedApplyOffert,
      gatedApplyPerso,
      handleClearOrder,
      handleRemoveItem,
    }),
    [
      remiseDialogOpen,
      handleRequestRemise,
      handleConfirmRemise,
      handleCloseRemiseDialog,
      gatedApplyHappyHour,
      gatedApplyOffert,
      gatedApplyPerso,
      handleClearOrder,
      handleRemoveItem,
    ]
  );
}

export type POSContainerLineActions = ReturnType<typeof usePOSContainerLineActions>;
