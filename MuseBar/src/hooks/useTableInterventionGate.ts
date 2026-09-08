import { useCallback, useEffect } from 'react';
import { PERMISSIONS } from '@mosehxl/types';
import { useStepUpAuth } from '../contexts/StepUpAuthContext';
import type { ActiveTableState, PinActorState } from '../contexts/PinSessionsContext';
import { setFloorOrderAttribution } from '../services/floorOrderAttribution';

const INTERVENE_COPY = {
  title: 'Intervention sur une autre table',
  description:
    'PIN autorisé pour agir sur une table assignée à un autre serveur. L’addition reste sur son Z ; seul « Assigner à » transfère la propriété.',
} as const;

/**
 * Step-up when the active PIN is not the table owner. Does not transfer ownership or Z.
 */
export function useTableInterventionGate(
  activeTable: ActiveTableState | null | undefined,
  pinActor: PinActorState | null | undefined
): () => Promise<void> {
  const { ensurePermission } = useStepUpAuth();
  return useCallback(async () => {
    if (!activeTable || !pinActor) return;
    const assignedId = activeTable.assignedWaiterUserId;
    if (assignedId == null || pinActor.userId === assignedId) return;
    if (pinActor.role === 'establishment_admin') return;
    await ensurePermission(PERMISSIONS.pos_intervene_table, { ...INTERVENE_COPY });
  }, [activeTable, pinActor, ensurePermission]);
}

/** Keep createOrder attribution in sync: table → owner Z; comptoir → Total comptoir (null waiter). */
export function useFloorOrderAttributionSync(
  pinActor: PinActorState | null | undefined,
  activeTable: ActiveTableState | null | undefined
): void {
  useEffect(() => {
    if (!pinActor) {
      setFloorOrderAttribution(null);
      return;
    }
    if (activeTable) {
      setFloorOrderAttribution({
        waiterUserId: activeTable.assignedWaiterUserId ?? pinActor.userId,
        waiterDisplayName:
          activeTable.assignedWaiterDisplayName ?? pinActor.displayName,
        tableLabel: activeTable.label ?? null,
      });
    } else {
      setFloorOrderAttribution({
        waiterUserId: null,
        waiterDisplayName: null,
        tableLabel: null,
      });
    }
  }, [pinActor, activeTable]);
}
