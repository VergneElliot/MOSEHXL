import { useCallback, useEffect, useMemo, useState } from 'react';
import * as floorApi from '../../../services/api/floor';
import type { FloorCanvasTable } from '../../floor/FloorCanvasView';
import { detectSizePreset } from '../../floor/floorGeometry';
import { toCanvasTables } from './floorPlansCanvas';
import { useFloorPlansPlanOps } from './useFloorPlansPlanOps';
import { useFloorPlansTableCreate } from './useFloorPlansTableCreate';
import { useFloorPlansTableUpdate } from './useFloorPlansTableUpdate';

export function useFloorPlansEditor() {
  const [plans, setPlans] = useState<floorApi.FloorPlanDto[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [tables, setTables] = useState<floorApi.DiningTableDto[]>([]);
  const [localTables, setLocalTables] = useState<FloorCanvasTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [newPlanName, setNewPlanName] = useState('');
  const [renamePlan, setRenamePlan] = useState<{ id: number; name: string } | null>(null);
  const [bulkCount, setBulkCount] = useState('4');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const planList = await floorApi.listFloorPlans();
      setPlans(planList);
      setSelectedPlanId((prev) => {
        if (prev != null && planList.some((p) => p.id === prev)) return prev;
        return planList[0]?.id ?? null;
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Impossible de charger les plans');
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadTables = useCallback(async (planId: number) => {
    try {
      const list = await floorApi.listDiningTables(planId);
      setTables(list);
      setLocalTables(toCanvasTables(list));
      setSelectedTableId((prev) =>
        prev != null && list.some((t) => t.id === prev) ? prev : null
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Impossible de charger les tables');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (selectedPlanId != null) void reloadTables(selectedPlanId);
    else {
      setTables([]);
      setLocalTables([]);
      setSelectedTableId(null);
    }
  }, [selectedPlanId, reloadTables]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId) ?? null,
    [tables, selectedTableId]
  );
  const selectedLocal = useMemo(
    () => localTables.find((t) => t.id === selectedTableId) ?? null,
    [localTables, selectedTableId]
  );
  const sizePreset = selectedLocal
    ? detectSizePreset(selectedLocal.width, selectedLocal.height)
    : 'custom';

  const planOps = useFloorPlansPlanOps({
    newPlanName,
    setNewPlanName,
    renamePlan,
    setRenamePlan,
    setSelectedPlanId,
    setError,
    reload,
  });

  const tableCreate = useFloorPlansTableCreate({
    selectedPlanId,
    tables,
    selectedTable,
    selectedLocal,
    bulkCount,
    setSelectedTableId,
    setError,
    setSaving,
    reloadTables,
  });

  const tableUpdate = useFloorPlansTableUpdate({
    selectedPlanId,
    selectedTable,
    selectedLocal,
    selectedTableId,
    setTables,
    setLocalTables,
    setSelectedTableId,
    setError,
    setSaving,
    reloadTables,
  });

  return {
    plans,
    selectedPlanId,
    setSelectedPlanId,
    tables,
    localTables,
    setLocalTables,
    selectedTableId,
    setSelectedTableId,
    loading,
    saving,
    error,
    setError,
    snapEnabled,
    setSnapEnabled,
    newPlanName,
    setNewPlanName,
    renamePlan,
    setRenamePlan,
    bulkCount,
    setBulkCount,
    selectedPlan,
    selectedTable,
    selectedLocal,
    sizePreset,
    ...planOps,
    ...tableCreate,
    ...tableUpdate,
  };
}
