import { useCallback } from 'react';
import * as floorApi from '../../../services/api/floor';

export function useFloorPlansPlanOps(input: {
  newPlanName: string;
  setNewPlanName: (name: string) => void;
  renamePlan: { id: number; name: string } | null;
  setRenamePlan: (value: { id: number; name: string } | null) => void;
  setSelectedPlanId: (id: number | null) => void;
  setError: (message: string | null) => void;
  reload: () => Promise<void>;
}) {
  const {
    newPlanName,
    setNewPlanName,
    renamePlan,
    setRenamePlan,
    setSelectedPlanId,
    setError,
    reload,
  } = input;

  const handleCreatePlan = useCallback(async () => {
    const name = newPlanName.trim();
    if (!name) return;
    try {
      const plan = await floorApi.createFloorPlan(name);
      setNewPlanName('');
      await reload();
      setSelectedPlanId(plan.id);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Création du plan impossible');
    }
  }, [newPlanName, setNewPlanName, reload, setSelectedPlanId, setError]);

  const handleSaveRename = useCallback(async () => {
    if (!renamePlan) return;
    try {
      await floorApi.updateFloorPlan(renamePlan.id, { name: renamePlan.name.trim() });
      setRenamePlan(null);
      await reload();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Renommage impossible');
    }
  }, [renamePlan, setRenamePlan, reload, setError]);

  const handleTogglePlanActive = useCallback(
    async (plan: floorApi.FloorPlanDto) => {
      try {
        await floorApi.updateFloorPlan(plan.id, { is_active: !plan.is_active });
        await reload();
      } catch (err: unknown) {
        const e = err as { message?: string };
        setError(e.message || 'Mise à jour impossible');
      }
    },
    [reload, setError]
  );

  const handleDeletePlan = useCallback(
    async (plan: floorApi.FloorPlanDto) => {
      if (!window.confirm(`Supprimer le plan « ${plan.name} » et ses tables ?`)) return;
      try {
        await floorApi.deleteFloorPlan(plan.id);
        await reload();
      } catch (err: unknown) {
        const e = err as { message?: string };
        setError(e.message || 'Suppression impossible (tables encore liées ?)');
      }
    },
    [reload, setError]
  );

  return {
    handleCreatePlan,
    handleSaveRename,
    handleTogglePlanActive,
    handleDeletePlan,
  };
}
